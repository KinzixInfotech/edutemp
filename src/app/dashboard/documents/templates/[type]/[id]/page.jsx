'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
    Trash2,
    AlertCircle,
    Layout,
    Info,
    X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import FileUploadButton from '@/components/fileupload';
import CropImageDialog from '@/app/components/CropImageDialog';
import { uploadFiles } from '@/app/components/utils/uploadThing';
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

const formSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    description: z.string().optional(),
    type: z.string(),
    isDefault: z.boolean().default(false),
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
    },
};

const PLACEHOLDERS = [
    { value: 'studentName', label: 'Student Name' },
    { value: 'rollNumber', label: 'Roll Number' },
    { value: 'admissionNo', label: 'Admission Number' },
    { value: 'class', label: 'Class' },
    { value: 'section', label: 'Section' },
    { value: 'dob', label: 'Date of Birth' },
    { value: 'gender', label: 'Gender' },
    { value: 'fatherName', label: 'Father Name' },
    { value: 'motherName', label: 'Mother Name' },
    { value: 'address', label: 'Address' },
    { value: 'schoolName', label: 'School Name' },
    { value: 'examCenter', label: 'Exam Center' },
    { value: 'issueDate', label: 'Issue Date' },
    { value: 'validUntil', label: 'Valid Until' },
    { value: 'principalSignature', label: 'Principal Signature' },
    { value: 'classTeacherSignature', label: 'Class Teacher Signature' },
    { value: 'studentId', label: 'Student ID' },
    { value: 'verificationUrl', label: 'Verification URL' },
    { value: 'bloodGroup', label: 'Blood Group' },
    { value: 'studentPhoto', label: 'Student Photo' },
];

export default function EditTemplatePage() {
    const router = useRouter();
    const params = useParams();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const templateType = params?.type;
    const templateId = params?.id;
    const config = TEMPLATE_CONFIGS[templateType];

    const [activeTab, setActiveTab] = useState('builder');
    const [editorConfig, setEditorConfig] = useState({
        elements: [],
        canvasSize: { width: 800, height: 600 },
        backgroundImage: ''
    });
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [rawImage, setRawImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [currentField, setCurrentField] = useState(null);
    const [resetKeys, setResetKeys] = useState({
        background: 0,
    });

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
        },
    });

    const watchedValues = watch();

    // Populate form and editor when template data loads
    useEffect(() => {
        if (template) {
            reset({
                name: template.name,
                description: template.description || '',
                type: template.type || template.cardType || template.subType,
                isDefault: template.isDefault,
            });

            if (template.layoutConfig) {
                setEditorConfig({
                    elements: template.layoutConfig.elements || [],
                    canvasSize: template.layoutConfig.canvasSize || { width: 800, height: 600 },
                    backgroundImage: template.layoutConfig.backgroundImage || ''
                });
            }
        }
    }, [template, reset]);

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const layoutConfig = {
                ...editorConfig,
                elements: editorConfig.elements,
                canvasSize: editorConfig.canvasSize,
                backgroundImage: editorConfig.backgroundImage
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
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update template');
        },
    });

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

    const Icon = config.icon;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
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
                                if (currentField === 'backgroundImage') {
                                    setEditorConfig(prev => ({ ...prev, backgroundImage: res[0].url }));
                                }
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

            {/* Header Toolbar */}
            <div className="h-16 border-b bg-background flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(config.backUrl)}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <h1 className="font-semibold text-lg flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        Edit {config.title}
                    </h1>
                    <div className="flex items-center bg-muted rounded-md p-1">
                        <Button
                            variant={activeTab === 'builder' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('builder')}
                            className="h-7 text-xs"
                        >
                            <Layout className="h-3 w-3 mr-1" /> Builder
                        </Button>
                        <Button
                            variant={activeTab === 'details' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('details')}
                            className="h-7 text-xs"
                        >
                            <Info className="h-3 w-3 mr-1" /> Details
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                    <Button
                        onClick={handleSubmit(onSubmit)}
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'builder' ? (
                    <div className="h-full relative">
                        <CertificateDesignEditor
                            initialConfig={editorConfig}
                            onChange={setEditorConfig}
                            templateType={templateType}
                            placeholders={PLACEHOLDERS}
                        />
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center bg-muted/30 p-8 overflow-auto">
                        <Card className="w-full max-w-2xl">
                            <CardHeader>
                                <CardTitle>Template Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Template Name *</Label>
                                    <Input
                                        id="name"
                                        {...register('name')}
                                        placeholder="e.g., Annual Sports Certificate"
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-500">{errors.name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        {...register('description')}
                                        placeholder="Brief description of this template..."
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="type">Document Type</Label>
                                    <Select
                                        value={watchedValues.type}
                                        onValueChange={(value) => setValue('type', value)}
                                    >
                                        <SelectTrigger>
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

                                <div className="flex items-center justify-between py-2 border-t">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="isDefault">Set as Default Template</Label>
                                        <p className="text-sm text-muted-foreground">
                                            This template will be used by default for new documents
                                        </p>
                                    </div>
                                    <Switch
                                        id="isDefault"
                                        checked={watchedValues.isDefault}
                                        onCheckedChange={(checked) => setValue('isDefault', checked)}
                                    />
                                </div>

                                <div className="space-y-2 pt-4 border-t">
                                    <Label className="text-sm">Background Image (Optional)</Label>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Recommended: {editorConfig.canvasSize.width}x{editorConfig.canvasSize.height}px
                                    </p>
                                    <FileUploadButton
                                        onChange={(previewUrl) => handleImageUpload('backgroundImage', previewUrl)}
                                        resetKey={resetKeys.background}
                                        disabled={uploading}
                                    />
                                    {editorConfig.backgroundImage && (
                                        <div className="relative mt-3 group">
                                            <img
                                                src={editorConfig.backgroundImage}
                                                alt="Background"
                                                className="w-full h-32 object-cover border rounded"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setEditorConfig(prev => ({ ...prev, backgroundImage: '' }))}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the template.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate()}
                            className="bg-red-600 hover:bg-red-700"
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