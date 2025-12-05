'use client';

import { useState, useEffect } from 'react';
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
    Hash
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
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import html2canvas from 'html2canvas';
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
});

export default function GenerateCertificatePage() {
    const router = useRouter();
    const params = useParams();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [generating, setGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewConfig, setPreviewConfig] = useState(null);

    const certificateType = params?.type;
    const config = CERTIFICATE_CONFIGS[certificateType];

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
        },
    });

    const watchedValues = watch();

    // Fetch students
    const { data: students, isLoading: loadingStudents } = useQuery({
        queryKey: ['students', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/students?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch students');
            return res.json();
        },
        enabled: !!schoolId,
    });
    // console.log(students);


    // Fetch templates for this certificate type
    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ['certificate-templates', schoolId, config?.apiType],
        queryFn: async () => {
            if (!schoolId || !config) throw new Error('Invalid configuration');
            const res = await fetch(`/api/documents/${schoolId}/certificate-templates?type=${config.apiType}`);
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
        enabled: !!schoolId && !!config,
    });

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

        // Replace placeholders
        const replacements = {
            '{{studentName}}': student.name || 'Student Name',
            '{{rollNumber}}': student.rollNumber || 'Roll No',
            '{{admissionNo}}': student.admissionNo || 'Adm No',
            '{{class}}': student.class?.className || 'Class',
            '{{section}}': student.section?.sectionName || 'Section',
            '{{dob}}': student.dob ? new Date(student.dob).toLocaleDateString() : 'DOB',
            '{{fatherName}}': student.fatherName || 'Father Name',
            '{{motherName}}': student.motherName || 'Mother Name',
            '{{address}}': student.address || 'Address',
            '{{schoolName}}': fullUser?.schoolName || 'School Name',
            '{{issueDate}}': watchedValues.issueDate ? new Date(watchedValues.issueDate).toLocaleDateString() : new Date().toLocaleDateString(),
            '{{conduct}}': watchedValues.conduct || '',
            '{{purpose}}': watchedValues.purpose || '',
            '{{academicYear}}': watchedValues.academicYear || '',
            '{{dateOfLeaving}}': watchedValues.dateOfLeaving ? new Date(watchedValues.dateOfLeaving).toLocaleDateString() : '',
            '{{reason}}': watchedValues.reason || '',
            '{{eventName}}': watchedValues.eventName || '',
            '{{position}}': watchedValues.position || '',
            '{{title}}': watchedValues.title || '',
            '{{content}}': watchedValues.content || '',
            '{{remarks}}': watchedValues.remarks || '',
        };

        const processedElements = elements.map(el => {
            if (el.type === 'text' && el.content) {
                let content = el.content;
                Object.entries(replacements).forEach(([key, value]) => {
                    content = content.replace(new RegExp(key, 'g'), value);
                });
                return { ...el, content };
            }
            if (el.type === 'qrcode' && el.content) {
                let content = el.content;
                Object.entries(replacements).forEach(([key, value]) => {
                    content = content.replace(new RegExp(key, 'g'), value);
                });
                return { ...el, content };
            }
            if (el.type === 'image' && el.url && el.url.includes('{{studentPhoto}}')) {
                return { ...el, url: student.photoUrl || 'https://placehold.co/100x100?text=Photo' };
            }
            return el;
        });

        setPreviewConfig({
            elements: processedElements,
            canvasSize: template.layoutConfig.canvasSize,
            backgroundImage: template.layoutConfig.backgroundImage
        });

    }, [JSON.stringify(watchedValues), templates, students, fullUser]);

    const handleGeneratePDF = async () => {
        // Target the specific content div
        const element = document.getElementById('certificate-capture-target');
        if (!element) {
            toast.error('Preview not ready');
            return;
        }

        try {
            setGenerating(true);

            // Use html-to-image with font options (matching admit card generation)
            const dataUrl = await htmlToImage.toPng(element, {
                quality: 1.0,
                pixelRatio: 2,
                skipFonts: true, // Skip font parsing to avoid errors
                preferCanvas: true, // Prefer canvas rendering for better compatibility
                backgroundColor: '#ffffff', // Ensure white background for the image
            });

            // Create image to get dimensions
            const img = new Image();
            img.src = dataUrl;

            await new Promise((resolve) => {
                img.onload = resolve;
            });

            const imgWidth = img.width / 2; // Adjust for pixelRatio 2
            const imgHeight = img.height / 2;
            const orientation = imgWidth > imgHeight ? 'l' : 'p';

            const pdf = new jsPDF({
                orientation,
                unit: 'pt',
                format: [imgWidth, imgHeight]
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${config.title}_${watchedValues.studentId || 'certificate'}.pdf`);

            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPreviewUrl(pdfUrl);

            toast.success('Certificate generated and downloaded!');
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
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            {/* Header Toolbar */}
            <div className="h-14 border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        <h1 className="font-semibold text-lg">{config.title}</h1>
                    </div>
                    <div className="h-6 w-px bg-border mx-2" />
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
                                        {students?.map((student) => (
                                            <SelectItem key={student.userId} value={student.userId}>
                                                <div className="flex flex-col text-left">
                                                    <span>{student.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Roll: {student.rollNumber} | Class: {student.class?.className}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
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