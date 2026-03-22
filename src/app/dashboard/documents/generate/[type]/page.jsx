'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Save,
    Loader2,
    Award,
    ArrowLeft,
    Eye,
    Download,
    AlertCircle,
    User,
    Calendar,
    FileText,
    Hash,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertTriangle,
    Settings2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import { DEFAULT_TEMPLATES } from '@/lib/default-templates';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

// Certificate type configurations
const CERTIFICATE_CONFIGS = {
    character: {
        title: 'Character Certificate',
        description: 'Issue character certificate for students',
        fields: ['studentId', 'issueDate', 'conduct', 'remarks'],
        apiType: 'character',
    },
    bonafide: {
        title: 'Bonafide Certificate',
        description: 'Issue bonafide/study certificate',
        fields: ['studentId', 'issueDate', 'purpose', 'academicYear'],
        apiType: 'bonafide',
    },
    transfer: {
        title: 'Transfer Certificate',
        description: 'Issue transfer certificate (TC)',
        fields: ['studentId', 'issueDate', 'dateOfLeaving', 'reason', 'remarks'],
        apiType: 'transfer',
    },
    'school-leaving': {
        title: 'School Leaving Certificate',
        description: 'Issue school leaving certificate',
        fields: ['studentId', 'issueDate', 'dateOfLeaving', 'reason', 'conduct'],
        apiType: 'school-leaving',
    },
    competition: {
        title: 'Competition Certificate',
        description: 'Issue certificate for competitions/events',
        fields: ['studentId', 'issueDate', 'eventName', 'position', 'date'],
        apiType: 'competition',
    },
    custom: {
        title: 'Custom Certificate',
        description: 'Create custom certificate with your own content',
        fields: ['studentId', 'issueDate', 'title', 'content'],
        apiType: 'custom',
    },
};

const formSchema = z.object({
    studentId: z.string().min(1, 'Student is required'),
    templateId: z.string().optional(),
    issueDate: z.string().min(1, 'Issue date is required'),
    // Dynamic fields
    conduct: z.string().optional(),
    remarks: z.string().optional(),
    purpose: z.string().optional(),
    academicYear: z.string().optional(),
    dateOfLeaving: z.string().optional(),
    reason: z.string().optional(),
    eventName: z.string().optional(),
    position: z.string().optional(),
    date: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    showToParent: z.boolean().default(false),
});

export default function GenerateCertificatePage() {
    const router = useRouter();
    const params = useParams();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [generating, setGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const [previewConfig, setPreviewConfig] = useState(null);
    const [fieldOverrides, setFieldOverrides] = useState({});
    const [showFieldMapper, setShowFieldMapper] = useState(false);

    const certificateType = params?.type;
    const config = CERTIFICATE_CONFIGS[certificateType];
    const { startUpload } = useR2Upload({ folder: 'documents' });

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            studentId: '',
            templateId: '',
            issueDate: new Date().toISOString().split('T')[0],
            showToParent: false,
        },
    });

    const watchedValues = watch();

    // Fetch students
    const { data: students, isLoading: loadingStudents } = useQuery({
        queryKey: ['students', schoolId, academicYearId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const params = new URLSearchParams({ schoolId });
            if (academicYearId) params.append('academicYearId', academicYearId);
            const res = await fetch(`/api/students?${params}`);
            if (!res.ok) throw new Error('Failed to fetch students');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch document settings (signature/stamp URLs)
    const { data: docSettings } = useQuery({
        queryKey: ['document-settings', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/settings/documents`);
            if (!res.ok) return {};
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    // Get unique classes from students
    const availableClasses = useMemo(() => {
        if (!students) return [];
        const classMap = new Map();
        students.forEach(s => {
            if (s.class?.className && s.classId) classMap.set(s.classId, s.class.className);
        });
        return Array.from(classMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [students]);

    // Get unique sections for selected class
    const availableSections = useMemo(() => {
        if (!students || !classFilter) return [];
        const sectionMap = new Map();
        students.filter(s => s.classId === classFilter).forEach(s => {
            if (s.section?.sectionName && s.sectionId) sectionMap.set(s.sectionId, s.section.sectionName);
        });
        return Array.from(sectionMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, classFilter]);

    // Filter students by search + class + section
    const filteredStudents = useMemo(() => {
        if (!students) return [];
        let filtered = students;
        if (classFilter) filtered = filtered.filter(s => s.classId === classFilter);
        if (sectionFilter) filtered = filtered.filter(s => s.sectionId === sectionFilter);
        if (studentSearch.trim()) {
            const search = studentSearch.toLowerCase();
            filtered = filtered.filter(s =>
                (s.name || s.user?.name || '').toLowerCase().includes(search) ||
                (s.rollNumber || '').toLowerCase().includes(search)
            );
        }
        return filtered;
    }, [students, studentSearch, classFilter, sectionFilter]);


    // Fetch saved templates for this certificate type
    const { data: savedTemplates, isLoading: loadingTemplates } = useQuery({
        queryKey: ['certificate-templates', schoolId, config?.apiType],
        queryFn: async () => {
            if (!schoolId || !config) throw new Error('Invalid configuration');
            const res = await fetch(`/api/documents/${schoolId}/certificate-templates?type=${config.apiType}`);
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
        enabled: !!schoolId && !!config,
    });

    // Merge saved DB templates with built-in default templates
    const templates = useMemo(() => {
        const saved = savedTemplates || [];
        // Get built-in templates for this certificate type + generic fallbacks
        const builtIn = [
            ...(DEFAULT_TEMPLATES[certificateType] || []),
            ...(DEFAULT_TEMPLATES['certificate'] || [])
        ].filter(bi => !saved.some(s => s.id === bi.id))
            .map(t => ({ ...t, isBuiltIn: true }));
        return [...saved, ...builtIn];
    }, [savedTemplates, certificateType]);

    // Get default template
    useEffect(() => {
        if (templates?.length > 0 && !watchedValues.templateId) {
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
            setValue('templateId', defaultTemplate.id);
        }
    }, [templates, setValue, watchedValues.templateId]);

    // Update preview when form values or template changes
    useEffect(() => {
        if (!templates || !students || !watchedValues.templateId) return;

        const template = templates.find(t => t.id === watchedValues.templateId);
        if (!template || !template.layoutConfig) return;

        const student = students.find(s => s.userId === watchedValues.studentId) || {};

        // Create a deep copy of elements to avoid mutating original
        const elements = JSON.parse(JSON.stringify(template.layoutConfig.elements || []));

        // Map conduct enum values to display labels
        const conductLabels = { 'excellent': 'Excellent', 'very-good': 'Very Good', 'good': 'Good', 'satisfactory': 'Satisfactory' };
        const conductDisplay = conductLabels[watchedValues.conduct] || watchedValues.conduct || '';

        // Generate a certificate number for QR / verification
        const certNumber = `CERT-${Date.now()}`;
        const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/certificate/${certNumber}` : '';

        // Auto replacements from student/school/form data
        const autoReplacements = {
            '{{studentName}}': student.name || '',
            '{{rollNumber}}': student.rollNumber || '',
            '{{admissionNo}}': student.admissionNo || '',
            '{{class}}': student.class?.className || '',
            '{{section}}': student.section?.sectionName || '',
            '{{dob}}': student.dob ? new Date(student.dob).toLocaleDateString() : '',
            '{{fatherName}}': student.fatherName || '',
            '{{motherName}}': student.motherName || '',
            '{{address}}': student.address || '',
            '{{schoolName}}': fullUser?.schoolName || '',
            '{{schoolAddress}}': fullUser?.school?.address || '',
            '{{issueDate}}': watchedValues.issueDate ? new Date(watchedValues.issueDate).toLocaleDateString() : new Date().toLocaleDateString(),
            '{{conduct}}': conductDisplay,
            '{{purpose}}': watchedValues.purpose || '',
            '{{academicYear}}': watchedValues.academicYear || '',
            '{{dateOfLeaving}}': watchedValues.dateOfLeaving ? new Date(watchedValues.dateOfLeaving).toLocaleDateString() : '',
            '{{reason}}': watchedValues.reason || '',
            '{{eventName}}': watchedValues.eventName || '',
            '{{position}}': watchedValues.position || '',
            '{{title}}': watchedValues.title || '',
            '{{content}}': watchedValues.content || '',
            '{{remarks}}': watchedValues.remarks || '',
            '{{verificationUrl}}': verificationUrl,
            '{{certificateNumber}}': certNumber,
            '{{tcNumber}}': `TC-${Date.now()}`,
            '{{nationality}}': student.nationality || '',
            '{{religion}}': student.religion || '',
            '{{category}}': student.category || '',
            '{{bloodGroup}}': student.bloodGroup || '',
            '{{gender}}': student.gender || '',
            '{{admissionDate}}': student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '',
            '{{parentContact}}': student.parentContact || student.fatherPhone || '',
        };

        // Merge with user overrides (overrides win)
        const replacements = { ...autoReplacements };
        Object.entries(fieldOverrides).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                replacements[`{{${key}}}`] = value;
            }
        });

        // Image replacements (URLs)
        const imageReplacements = {
            '{{studentPhoto}}': student?.user?.profilePicture || student.photoUrl || 'https://placehold.co/100x100?text=Photo',
            '{{schoolLogo}}': fullUser?.school?.profilePicture || 'https://placehold.co/100x100?text=Logo',
            '{{principalSignature}}': docSettings?.signatureUrl || fullUser?.school?.signatureUrl || 'https://placehold.co/100x50?text=Signature',
            '{{schoolStamp}}': docSettings?.stampUrl || fullUser?.school?.stampUrl || 'https://placehold.co/100x50?text=Stamp',
        };

        const processedElements = elements.map(el => {
            if (el.type === 'text' && el.content) {
                let content = el.content;
                Object.entries(replacements).forEach(([key, value]) => {
                    content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
                });
                return { ...el, content };
            }
            if (el.type === 'qrcode' && el.content) {
                let content = el.content;
                Object.entries(replacements).forEach(([key, value]) => {
                    content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
                });
                return { ...el, content };
            }
            if (el.type === 'image') {
                let url = el.url || '';
                Object.entries(imageReplacements).forEach(([key, value]) => {
                    if (url.includes(key) || url === key) {
                        url = value;
                    }
                });
                if (!url || url.startsWith('{{')) {
                    url = 'https://placehold.co/100x100?text=Image';
                }
                return { ...el, url };
            }
            return el;
        });

        setPreviewConfig({
            elements: processedElements,
            canvasSize: template.layoutConfig.canvasSize,
            backgroundImage: template.layoutConfig.backgroundImage
        });

    }, [JSON.stringify(watchedValues), templates, students, fullUser, docSettings, fieldOverrides]);

    const handleGeneratePDF = async () => {
        // Target the specific content div
        const element = document.getElementById('certificate-capture-target');
        if (!element) {
            toast.error('Preview not ready');
            return;
        }

        try {
            setGenerating(true);

            // Use html-to-image with font options
            const dataUrl = await htmlToImage.toPng(element, {
                quality: 1.0,
                pixelRatio: 2,
                skipFonts: true,
                preferCanvas: true,
                backgroundColor: '#ffffff',
            });

            // Create PDF
            const img = new Image();
            img.src = dataUrl;
            await new Promise((resolve) => img.onload = resolve);

            const imgWidth = img.width / 2;
            const imgHeight = img.height / 2;
            const orientation = imgWidth > imgHeight ? 'l' : 'p';

            const pdf = new jsPDF({
                orientation,
                unit: 'pt',
                format: [imgWidth, imgHeight]
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);

            // Generate Filename
            const filename = `${config.title}_${watchedValues.studentId || 'certificate'}.pdf`;
            pdf.save(filename); // Client Download

            // Upload and Save to History
            const pdfBlob = pdf.output('blob');
            // Fix: Filename for upload needs to be proper
            const uploadFile = new File([pdfBlob], filename, { type: "application/pdf" });

            toast.message('Saving to history...');
            const uploadRes = await startUpload([uploadFile], { schoolId });

            if (uploadRes && uploadRes[0]) {
                await fetch(`/api/documents/${schoolId}/certificates/history`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        templateId: watchedValues.templateId,
                        students: [{
                            studentId: watchedValues.studentId,
                            customFields: {
                                layoutConfig: previewConfig, // Store snapshot
                                ...watchedValues // Store form values (issueDate, etc.)
                            },
                            fileUrl: uploadRes[0].url
                        }]
                    })
                });
                toast.success('Certificate saved to history');
            } else {
                toast.warning('Downloaded but failed to save to history');
            }

            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPreviewUrl(pdfUrl);

        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Failed to generate PDF: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    if (!schoolId || loadingStudents || loadingTemplates) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col bg-background z-10">
            {/* Header Toolbar */}
            <div className="h-14 border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/documents')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        <h1 className="font-semibold text-lg">{config.title}</h1>
                    </div>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        {config.description}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {previewUrl && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(previewUrl, '_blank')}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            View PDF
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit(handleGeneratePDF)}
                        disabled={generating || !previewConfig}
                        size="sm"
                    >
                        {generating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Generate & Download
                    </Button>
                </div>
            </div>

            {/* Main Content - Sidebar + Preview */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Form */}
                <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-4">
                            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Details</h2>

                            {/* Student Selection */}
                            <div className="space-y-1.5">
                                <Label htmlFor="studentId" className="text-xs flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    Select Student *
                                </Label>
                                <Select
                                    value={watchedValues.studentId}
                                    onValueChange={(value) => setValue('studentId', value)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Choose a student..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="p-2 pb-1 space-y-1.5">
                                            <div className="flex gap-1.5">
                                                <select
                                                    value={classFilter}
                                                    onChange={(e) => { setClassFilter(e.target.value); setSectionFilter(''); }}
                                                    className="h-7 text-xs rounded border bg-background px-1.5 flex-1 min-w-0"
                                                >
                                                    <option value="">All Classes</option>
                                                    {availableClasses.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                {classFilter && availableSections.length > 0 && (
                                                    <select
                                                        value={sectionFilter}
                                                        onChange={(e) => setSectionFilter(e.target.value)}
                                                        className="h-7 text-xs rounded border bg-background px-1.5 w-20"
                                                    >
                                                        <option value="">All</option>
                                                        {availableSections.map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            <Input
                                                placeholder="Search students..."
                                                value={studentSearch}
                                                onChange={(e) => setStudentSearch(e.target.value)}
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                        {filteredStudents?.map((student) => (
                                            <SelectItem key={student.userId} value={student.userId}>
                                                <div className="flex flex-col text-left">
                                                    <span>{student.name || student.user?.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Roll: {student.rollNumber} | {student.class?.className}{student.section?.sectionName ? ` - ${student.section.sectionName}` : ''}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                        {filteredStudents?.length === 0 && (
                                            <div className="text-center text-xs text-muted-foreground py-3">No students found</div>
                                        )}
                                    </SelectContent>
                                </Select>
                                {errors.studentId && (
                                    <p className="text-xs text-red-500">{errors.studentId.message}</p>
                                )}
                            </div>

                            {/* Template Selection */}
                            <div className="space-y-1.5">
                                <Label htmlFor="templateId" className="text-xs flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Certificate Template
                                </Label>
                                <Select
                                    value={watchedValues.templateId}
                                    onValueChange={(value) => setValue('templateId', value)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Choose a template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates?.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                {template.name}
                                                {template.isDefault && (
                                                    <Badge variant="secondary" className="ml-2 text-[10px] h-4">Default</Badge>
                                                )}
                                                {template.isBuiltIn && (
                                                    <Badge variant="outline" className="ml-2 text-[10px] h-4">Built-in</Badge>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Issue Date */}
                            <div className="space-y-1.5">
                                <Label htmlFor="issueDate" className="text-xs flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Issue Date *
                                </Label>
                                <Input
                                    id="issueDate"
                                    type="date"
                                    {...register('issueDate')}
                                    className="h-9 text-sm"
                                />
                                {errors.issueDate && (
                                    <p className="text-xs text-red-500">{errors.issueDate.message}</p>
                                )}
                            </div>

                            <div className="h-px bg-border my-2" />

                            {/* Dynamic Fields Based on Certificate Type */}
                            {config.fields.includes('conduct') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="conduct" className="text-xs">Conduct</Label>
                                    <Select
                                        value={watchedValues.conduct}
                                        onValueChange={(value) => setValue('conduct', value)}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select conduct..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="excellent">Excellent</SelectItem>
                                            <SelectItem value="very-good">Very Good</SelectItem>
                                            <SelectItem value="good">Good</SelectItem>
                                            <SelectItem value="satisfactory">Satisfactory</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {config.fields.includes('purpose') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="purpose" className="text-xs">Purpose</Label>
                                    <Input
                                        id="purpose"
                                        {...register('purpose')}
                                        placeholder="e.g., Bank account, Passport"
                                        className="h-9 text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('academicYear') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="academicYear" className="text-xs">Academic Year</Label>
                                    <Input
                                        id="academicYear"
                                        {...register('academicYear')}
                                        placeholder="e.g., 2023-2024"
                                        className="h-9 text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('dateOfLeaving') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="dateOfLeaving" className="text-xs">Date of Leaving</Label>
                                    <Input
                                        id="dateOfLeaving"
                                        type="date"
                                        {...register('dateOfLeaving')}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('reason') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="reason" className="text-xs">Reason</Label>
                                    <Input
                                        id="reason"
                                        {...register('reason')}
                                        placeholder="Reason for leaving/transfer"
                                        className="h-9 text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('eventName') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="eventName" className="text-xs">Event/Competition Name *</Label>
                                    <Input
                                        id="eventName"
                                        {...register('eventName')}
                                        placeholder="e.g., Science Fair 2024"
                                        className="h-9 text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('position') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="position" className="text-xs">Position/Achievement</Label>
                                    <Input
                                        id="position"
                                        {...register('position')}
                                        placeholder="e.g., 1st Place, Gold Medal"
                                        className="h-9 text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('title') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="title" className="text-xs">Certificate Title</Label>
                                    <Input
                                        id="title"
                                        {...register('title')}
                                        placeholder="Enter certificate title"
                                        className="h-9 text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('content') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="content" className="text-xs">Certificate Content</Label>
                                    <Textarea
                                        id="content"
                                        {...register('content')}
                                        placeholder="Enter certificate content..."
                                        rows={5}
                                        className="text-sm resize-none"
                                    />
                                </div>
                            )}

                            {config.fields.includes('remarks') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="remarks" className="text-xs">Remarks (Optional)</Label>
                                    <Textarea
                                        id="remarks"
                                        {...register('remarks')}
                                        placeholder="Any additional remarks..."
                                        rows={3}
                                        className="text-sm resize-none"
                                    />
                                </div>
                            )}

                            <div className="h-px bg-border my-2" />

                            {/* Field Mapping Panel */}
                            {watchedValues.templateId && templates && (() => {
                                const template = templates.find(t => t.id === watchedValues.templateId);
                                if (!template?.layoutConfig?.elements) return null;
                                // Detect all {{...}} placeholders from the template
                                const placeholderSet = new Set();
                                template.layoutConfig.elements.forEach(el => {
                                    const text = el.content || el.url || '';
                                    const matches = text.match(/\{\{([^}]+)\}\}/g);
                                    if (matches) matches.forEach(m => placeholderSet.add(m.replace(/[{}]/g, '')));
                                });
                                const placeholders = Array.from(placeholderSet).sort();
                                if (placeholders.length === 0) return null;

                                const student = students?.find(s => s.userId === watchedValues.studentId) || {};
                                const conductLabels = { 'excellent': 'Excellent', 'very-good': 'Very Good', 'good': 'Good', 'satisfactory': 'Satisfactory' };
                                // Get auto-resolved values for display
                                const autoValues = {
                                    studentName: student.name || '',
                                    rollNumber: student.rollNumber || '',
                                    admissionNo: student.admissionNo || '',
                                    class: student.class?.className || '',
                                    section: student.section?.sectionName || '',
                                    dob: student.dob ? new Date(student.dob).toLocaleDateString() : '',
                                    fatherName: student.fatherName || '',
                                    motherName: student.motherName || '',
                                    address: student.address || '',
                                    schoolName: fullUser?.schoolName || '',
                                    schoolAddress: fullUser?.school?.address || '',
                                    issueDate: watchedValues.issueDate ? new Date(watchedValues.issueDate).toLocaleDateString() : '',
                                    conduct: conductLabels[watchedValues.conduct] || watchedValues.conduct || '',
                                    purpose: watchedValues.purpose || '',
                                    academicYear: watchedValues.academicYear || '',
                                    dateOfLeaving: watchedValues.dateOfLeaving ? new Date(watchedValues.dateOfLeaving).toLocaleDateString() : '',
                                    reason: watchedValues.reason || '',
                                    eventName: watchedValues.eventName || '',
                                    position: watchedValues.position || '',
                                    title: watchedValues.title || '',
                                    content: watchedValues.content || '',
                                    remarks: watchedValues.remarks || '',
                                    nationality: student.nationality || '',
                                    religion: student.religion || '',
                                    category: student.category || '',
                                    bloodGroup: student.bloodGroup || '',
                                    gender: student.gender || '',
                                };

                                return (
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowFieldMapper(!showFieldMapper)}
                                            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Settings2 className="h-3.5 w-3.5" />
                                                Field Mapping ({placeholders.length})
                                            </span>
                                            {showFieldMapper ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                        </button>
                                        {showFieldMapper && (
                                            <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                                {placeholders.map(ph => {
                                                    const resolved = fieldOverrides[ph] || autoValues[ph] || '';
                                                    const isMapped = !!resolved;
                                                    const isOverridden = !!fieldOverrides[ph];
                                                    return (
                                                        <div key={ph} className={`flex items-start gap-1.5 p-1.5 rounded text-xs border ${isMapped ? 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20' : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
                                                            }`}>
                                                            {isMapped ? (
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                                            ) : (
                                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-[11px] text-foreground truncate">
                                                                    {`{{${ph}}}`}
                                                                </div>
                                                                {!isOverridden && resolved && (
                                                                    <div className="text-[10px] text-muted-foreground truncate" title={resolved}>
                                                                        → {resolved}
                                                                    </div>
                                                                )}
                                                                <input
                                                                    type="text"
                                                                    placeholder={resolved || 'Enter value...'}
                                                                    value={fieldOverrides[ph] || ''}
                                                                    onChange={(e) => setFieldOverrides(prev => ({ ...prev, [ph]: e.target.value }))}
                                                                    className="mt-0.5 w-full h-6 text-[11px] px-1.5 rounded border bg-background focus:ring-1 focus:ring-primary/30 outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="h-px bg-border my-2" />

                            {/* Parent Sharing */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Share with Parents</Label>
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm dark:text-black font-medium">Push to Parents</Label>
                                        <p className="text-[10px] dark:text-muted-foreground">
                                            Send notification & make visible in parent app
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        {...register('showToParent')}
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Side - Preview Canvas */}
                <div className="flex-1 bg-muted/30 overflow-auto" id="certificate-preview-container">
                    {!previewConfig ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Award className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                            <p className="text-sm text-muted-foreground">
                                Select a student and template to see the preview
                            </p>
                        </div>
                    ) : (
                        <div className="min-h-full p-8 flex items-start justify-center">
                            <div id="certificate-capture-target" className="bg-white">
                                <CertificateDesignEditor
                                    key={JSON.stringify(previewConfig)}
                                    initialConfig={previewConfig}
                                    readOnly={true}
                                    templateType="certificate"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}