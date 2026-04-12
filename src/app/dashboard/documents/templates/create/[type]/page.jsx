'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
    X,
    Layout,
    Info,
    Palette,
    Sparkles,
    Upload,
    FileImage,
    FileText as FileTextIcon,
    Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { uploadFilesToR2 } from '@/hooks/useR2Upload';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import { DEFAULT_TEMPLATES } from '@/lib/default-templates';
import { extractTemplatePlaceholders } from '@/lib/certificate-template-mapping';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    { value: 'schoolAddress', label: 'School Address' },
    { value: 'schoolLogo', label: 'School Logo (Image)' },
    { value: 'schoolStamp', label: 'School Stamp (Image)' },
    { value: 'examCenter', label: 'Exam Center' },
    { value: 'examName', label: 'Exam Name' },
    { value: 'examSchedule', label: 'Exam Schedule' },
    { value: 'seatNumber', label: 'Seat Number' },
    { value: 'center', label: 'Center' },
    { value: 'venue', label: 'Venue' },
    { value: 'issueDate', label: 'Issue Date' },
    { value: 'validUntil', label: 'Valid Until' },
    { value: 'principalSignature', label: 'Principal Signature (Image)' },
    { value: 'classTeacherSignature', label: 'Class Teacher Signature' },
    { value: 'studentId', label: 'Student ID' },
    { value: 'verificationUrl', label: 'Verification URL' },
    { value: 'bloodGroup', label: 'Blood Group' },
    { value: 'studentPhoto', label: 'Student Photo (Image)' },
];

export default function CreateTemplatePage() {
    const router = useRouter();
    const params = useParams();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const templateType = params?.type;
    const config = TEMPLATE_CONFIGS[templateType];

    const [activeTab, setActiveTab] = useState('builder');
    const [loadingTheme, setLoadingTheme] = useState(false);

    // Default to A4 Landscape for certificates, A4 Portrait for others
    const getDefaultSize = () => {
        if (templateType === 'certificate') {
            return { width: 1123, height: 794 }; // A4 Landscape
        } else if (templateType === 'idcard') {
            return { width: 638, height: 1011 }; // ID Card size (portrait)
        } else {
            return { width: 794, height: 1123 }; // A4 Portrait
        }
    };

    const [editorConfig, setEditorConfig] = useState({
        elements: [],
        canvasSize: getDefaultSize(),
        backgroundImage: '',
        backgroundAsset: null
    });

    const [uploading, setUploading] = useState(false);
    const [rawImage, setRawImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [currentField, setCurrentField] = useState(null);
    const [resetKeys, setResetKeys] = useState({
        background: 0,
    });
    const [uploadThemeOpen, setUploadThemeOpen] = useState(false);
    const [themeUploadFile, setThemeUploadFile] = useState(null);
    const [themeUploadName, setThemeUploadName] = useState('');
    const [themeUploadDescription, setThemeUploadDescription] = useState('');
    const [uploadingThemeAsset, setUploadingThemeAsset] = useState(false);
    const [savedUploadedThemes, setSavedUploadedThemes] = useState([]);

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
            type: config?.defaultType || '',
            isDefault: false,
        },
    });

    const watchedValues = watch();
    const uploadedThemesStorageKey = useMemo(() => {
        if (!schoolId || !templateType) return null;
        return `uploaded-template-themes:${schoolId}:${templateType}`;
    }, [schoolId, templateType]);

    useEffect(() => {
        if (!uploadedThemesStorageKey || typeof window === 'undefined') return;
        try {
            const stored = window.localStorage.getItem(uploadedThemesStorageKey);
            setSavedUploadedThemes(stored ? JSON.parse(stored) : []);
        } catch (error) {
            console.error('Failed to load uploaded themes', error);
            setSavedUploadedThemes([]);
        }
    }, [uploadedThemesStorageKey]);

    const persistUploadedThemes = (themes) => {
        setSavedUploadedThemes(themes);
        if (!uploadedThemesStorageKey || typeof window === 'undefined') return;
        window.localStorage.setItem(uploadedThemesStorageKey, JSON.stringify(themes));
    };

    const handleThemeSelect = async (template) => {
        setLoadingTheme(true);

        // Simulate loading delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, 300));

        setEditorConfig({
            elements: template.layoutConfig.elements || [],
            canvasSize: template.layoutConfig.canvasSize || getDefaultSize(),
            backgroundImage: template.layoutConfig.backgroundImage || '',
            backgroundAsset: template.layoutConfig.backgroundAsset || null,
        });

        if (template.name && !watchedValues.name) {
            setValue('name', template.name);
        }

        setLoadingTheme(false);
        setActiveTab('builder');
        toast.success(`Theme "${template.name}" applied successfully`);
    };

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const layoutConfig = {
                elements: editorConfig.elements,
                canvasSize: editorConfig.canvasSize,
                backgroundImage: editorConfig.backgroundImage,
                backgroundAsset: editorConfig.backgroundAsset || null,
                mappingPlaceholders: extractTemplatePlaceholders(editorConfig.elements || []),
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
            queryClient.invalidateQueries({ queryKey: [`${templateType}-templates`, schoolId] });
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

    const handleThemeUploadApply = async () => {
        if (!themeUploadFile) {
            toast.error('Please choose a PDF, JPG, JPEG, or PNG file');
            return;
        }
        if (!themeUploadName.trim()) {
            toast.error('Please enter a template name before uploading');
            return;
        }

        try {
            setUploadingThemeAsset(true);
            const res = await uploadFilesToR2('templates', { files: [themeUploadFile] });
            const uploadedUrl = res?.[0]?.url;
            if (!uploadedUrl) {
                toast.error('Upload failed');
                return;
            }

            const mimeType = themeUploadFile.type || (themeUploadFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
            const uploadedAsset = {
                url: uploadedUrl,
                mimeType,
                fileName: themeUploadFile.name,
                name: themeUploadName.trim(),
                description: themeUploadDescription.trim(),
            };

            const uploadedTheme = {
                id: `uploaded-theme-${Date.now()}`,
                name: themeUploadName.trim(),
                description: themeUploadDescription.trim(),
                source: 'uploaded',
                type: watchedValues.type,
                createdAt: new Date().toISOString(),
                layoutConfig: {
                    elements: [],
                    canvasSize: getDefaultSize(),
                    backgroundImage: mimeType.startsWith('image/') ? uploadedUrl : '',
                    backgroundAsset: uploadedAsset,
                    mappingPlaceholders: [],
                },
            };

            setEditorConfig({
                elements: [],
                canvasSize: getDefaultSize(),
                backgroundImage: mimeType.startsWith('image/') ? uploadedUrl : '',
                backgroundAsset: uploadedAsset,
            });
            persistUploadedThemes([uploadedTheme, ...savedUploadedThemes]);
            setValue('name', themeUploadName.trim(), { shouldDirty: true });
            setValue('description', themeUploadDescription.trim(), { shouldDirty: true });
            setUploadThemeOpen(false);
            setThemeUploadFile(null);
            setThemeUploadName('');
            setThemeUploadDescription('');
            setActiveTab('builder');
            toast.success(`${mimeType === 'application/pdf' ? 'PDF' : 'Image'} theme uploaded. You can now map fields on top of it.`);
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong during theme upload');
        } finally {
            setUploadingThemeAsset(false);
        }
    };

    const handleDeleteUploadedTheme = (themeId) => {
        const nextThemes = savedUploadedThemes.filter(theme => theme.id !== themeId);
        persistUploadedThemes(nextThemes);
        toast.success('Uploaded theme removed');
    };

    if (!templateType || !config) {
        return <div className="flex items-center justify-center min-h-screen">Invalid template type</div>;
    }

    const Icon = config.icon;
    const activeCertificateSubtype = watchedValues.type || config.defaultType;
    const availableTemplates = templateType === 'certificate'
        ? (DEFAULT_TEMPLATES[activeCertificateSubtype] || []).map((template) => ({
            ...template,
            type: activeCertificateSubtype,
            layoutConfig: {
                ...template.layoutConfig,
                mappingPlaceholders: template.layoutConfig?.mappingPlaceholders || extractTemplatePlaceholders(template.layoutConfig?.elements || []),
            },
        }))
        : (DEFAULT_TEMPLATES[templateType] || []);
    const filteredUploadedThemes = savedUploadedThemes
        .filter((theme) => !theme.type || theme.type === activeCertificateSubtype)
        .map((theme) => ({
            ...theme,
            layoutConfig: {
                ...theme.layoutConfig,
                mappingPlaceholders: theme.layoutConfig?.mappingPlaceholders || extractTemplatePlaceholders(theme.layoutConfig?.elements || []),
            },
        }));
    const allThemeCards = [...filteredUploadedThemes, ...availableTemplates];

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <Dialog open={uploadThemeOpen} onOpenChange={(open) => { if (!uploadingThemeAsset) setUploadThemeOpen(open); }}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>Upload School Theme</DialogTitle>
                        <DialogDescription>
                            Upload a Canva-exported PDF or JPG/PNG certificate design, then map fields on top of it in the builder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="theme-upload-name">Template Name</Label>
                            <Input
                                id="theme-upload-name"
                                value={themeUploadName}
                                onChange={(e) => setThemeUploadName(e.target.value)}
                                placeholder="e.g., DAV Transfer Certificate 2026"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="theme-upload-description">Description</Label>
                            <Textarea
                                id="theme-upload-description"
                                value={themeUploadDescription}
                                onChange={(e) => setThemeUploadDescription(e.target.value)}
                                placeholder="Optional notes about this uploaded school design..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="theme-upload-file">Design File</Label>
                            <Input
                                id="theme-upload-file"
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) => setThemeUploadFile(e.target.files?.[0] || null)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Best format: PDF. Also supported: PNG, JPG, JPEG.
                            </p>
                            {themeUploadFile && (
                                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                    {themeUploadFile.name}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadThemeOpen(false)} disabled={uploadingThemeAsset}>
                            Cancel
                        </Button>
                        <Button onClick={handleThemeUploadApply} disabled={uploadingThemeAsset}>
                            {uploadingThemeAsset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload and Open Builder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            const res = await uploadFilesToR2("templates", { files: [file] });
                            if (res && res[0]?.url) {
                                if (currentField === 'backgroundImage') {
                                    setEditorConfig(prev => ({ ...prev, backgroundImage: res[0].url, backgroundAsset: null }));
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
                        Create {config.title}
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
                            variant={activeTab === 'themes' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('themes')}
                            className="h-7 text-xs"
                        >
                            <Palette className="h-3 w-3 mr-1" /> Themes
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
                        variant="outline"
                        onClick={() => router.push(config.backUrl)}
                        disabled={createMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit(onSubmit)}
                        disabled={createMutation.isPending}
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

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'builder' ? (
                    <div className="h-full relative">
                        {loadingTheme && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Applying theme...</p>
                                </div>
                            </div>
                        )}
                        <CertificateDesignEditor
                            initialConfig={editorConfig}
                            onChange={setEditorConfig}
                            templateType={templateType}
                            placeholders={PLACEHOLDERS}
                        />
                    </div>
                ) : activeTab === 'themes' ? (
                    <div className="h-full bg-muted/30 overflow-auto flex flex-col">
                        <div className="p-6 border-b bg-background">
                            <div className="max-w-6xl mx-auto">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-2">Choose a Theme</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Select a pre-designed template, start blank, or upload a school PDF/image and map fields on top of it.
                                        </p>
                                    </div>
                                    <Button onClick={() => setUploadThemeOpen(true)} className="w-full md:w-auto">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload School Theme
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <div className="max-w-6xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <Card
                                            className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group relative overflow-hidden border-dashed"
                                            onClick={() => setUploadThemeOpen(true)}
                                        >
                                            <div className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-blue-50/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border flex items-center justify-center">
                                                            <FileTextIcon className="w-5 h-5 text-emerald-600" />
                                                        </div>
                                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border flex items-center justify-center">
                                                            <FileImage className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                    </div>
                                                    <Upload className="w-6 h-6 text-primary" />
                                                </div>
                                            </div>
                                            <CardContent className="p-4">
                                                <h3 className="font-bold text-lg mb-1">Upload School Design</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Upload PDF or JPG/PNG, add name and description, then map fields in the builder.
                                                </p>
                                            </CardContent>
                                        </Card>

                                        {/* Blank Canvas Option */}
                                        <Card
                                            className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group relative overflow-hidden"
                                            onClick={() => {
                                                setEditorConfig({
                                                    elements: [],
                                                    canvasSize: getDefaultSize(),
                                                    backgroundImage: '',
                                                    backgroundAsset: null,
                                                });
                                                setActiveTab('builder');
                                                toast.success('Blank canvas ready');
                                            }}
                                        >
                                            <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="relative z-10 flex flex-col items-center gap-3">
                                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                        <Layout className="w-10 h-10 text-blue-600" />
                                                    </div>
                                                    <Sparkles className="w-6 h-6 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                            <CardContent className="p-4">
                                                <h3 className="font-bold text-lg mb-1">Blank Canvas</h3>
                                                <p className="text-sm text-muted-foreground">Start from scratch with a clean slate</p>
                                            </CardContent>
                                        </Card>

                                        {/* Uploaded + Pre-built Templates */}
                                        {allThemeCards.map((template) => (
                                            <Card
                                                key={template.id}
                                                className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group relative overflow-hidden"
                                                onClick={() => handleThemeSelect(template)}
                                            >
                                                <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-3 bg-white shadow-md rounded transform group-hover:scale-[1.02] transition-transform overflow-hidden"
                                                        style={{
                                                            aspectRatio: template.layoutConfig.canvasSize.width / template.layoutConfig.canvasSize.height
                                                        }}
                                                    >
                                                        {template.layoutConfig.backgroundAsset?.mimeType?.startsWith('image/') && (
                                                            <img
                                                                src={template.layoutConfig.backgroundAsset.url}
                                                                alt={template.name}
                                                                className="absolute inset-0 h-full w-full object-cover"
                                                            />
                                                        )}
                                                        {template.layoutConfig.backgroundAsset?.mimeType === 'application/pdf' && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
                                                                <div className="flex flex-col items-center gap-2 text-emerald-700">
                                                                    <FileTextIcon className="h-10 w-10" />
                                                                    <span className="text-[11px] font-medium">PDF Theme</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {template.layoutConfig.elements.slice(0, 5).map((el, i) => (
                                                            <div
                                                                key={i}
                                                                className="absolute bg-gradient-to-r from-blue-200/60 to-purple-200/60 rounded-sm"
                                                                style={{
                                                                    left: `${(el.x / template.layoutConfig.canvasSize.width) * 100}%`,
                                                                    top: `${(el.y / template.layoutConfig.canvasSize.height) * 100}%`,
                                                                    width: `${(el.width / template.layoutConfig.canvasSize.width) * 100}%`,
                                                                    height: `${(el.height / template.layoutConfig.canvasSize.height) * 100}%`,
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                                                            Click to apply
                                                        </div>
                                                    </div>
                                                    {template.source === 'uploaded' && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="absolute bottom-2 right-2 h-8 w-8 bg-white/95 hover:bg-white z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteUploadedTheme(template.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <CardContent className="p-4">
                                                    <h3 className="font-bold text-lg mb-1">{template.name}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
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
                                                onClick={() => setEditorConfig(prev => ({ ...prev, backgroundImage: '', backgroundAsset: null }))}
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
        </div>
    );
}
