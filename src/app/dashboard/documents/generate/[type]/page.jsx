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
    const previewRef = useState(null); // We'll use document.getElementById instead for html2canvas to be safe

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

    }, [watchedValues, templates, students, fullUser]);

    const handleGeneratePDF = async () => {
        const element = document.getElementById('certificate-preview-container');
        if (!element) return;

        try {
            setGenerating(true);

            // Use html2canvas to capture the preview
            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            // Calculate PDF dimensions
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const orientation = imgWidth > imgHeight ? 'l' : 'p';

            const pdf = new jsPDF(orientation, 'pt', [imgWidth, imgHeight]);
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPreviewUrl(pdfUrl); // Update preview URL for download button

            // Also save to server if needed (optional, or we can just download)
            // For now, we'll just simulate the server save or use the existing mutation if it handles data saving

            // If we want to save the record to DB:
            generateMutation.mutate({
                ...watchedValues,
                fileUrl: pdfUrl // This is a blob URL, won't work for server. 
                // Ideally we upload the blob to storage (UploadThing/S3) and send that URL.
                // But for now let's just save the record data.
            });

            // Trigger download
            pdf.save(`${config.title}_${watchedValues.studentId}.pdf`);

            toast.success('Certificate generated and downloaded!');
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setGenerating(false);
        }
    };

    // Error page for invalid certificate type
    if (!certificateType || !config) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-6 w-6" />
                            <CardTitle className="text-xl">Invalid Certificate Type</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                The certificate type "<strong>{params?.type || 'unknown'}</strong>" is not recognized.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Valid certificate types:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {Object.entries(CERTIFICATE_CONFIGS).map(([key, value]) => (
                                    <li key={key}>
                                        <code className="bg-muted px-2 py-0.5 rounded">{key}</code> - {value.title}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Button
                            onClick={() => router.push('/dashboard/documents/generate/character')}
                            className="w-full"
                        >
                            Go to Character Certificate
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!schoolId || loadingStudents || loadingTemplates) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {/* <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="mr-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button> */}
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <Award className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                            <span>{config.title}</span>
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
                        {config.description}
                    </p>
                </div>
                {previewUrl && (
                    <Button
                        variant="outline"
                        onClick={() => window.open(previewUrl, '_blank')}
                        size="sm"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Form Section */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Certificate Details</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Fill in the required information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Student Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="studentId" className="text-sm flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Select Student *
                                </Label>
                                <Select
                                    value={watchedValues.studentId}
                                    onValueChange={(value) => setValue('studentId', value)}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Choose a student..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students?.map((student) => (
                                            <SelectItem key={student.userId} value={student.userId}>
                                                <div className="flex flex-col">
                                                    {/* <span>{student.name}</span> */}
                                                    <span>{student.name}</span>
                                                    <span className="text-xs text-muted-foreground">
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
                            <div className="space-y-2">
                                <Label htmlFor="templateId" className="text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Certificate Template
                                </Label>
                                <Select
                                    value={watchedValues.templateId}
                                    onValueChange={(value) => setValue('templateId', value)}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Choose a template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates?.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                {template.name}
                                                {template.isDefault && (
                                                    <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Issue Date */}
                            <div className="space-y-2">
                                <Label htmlFor="issueDate" className="text-sm flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Issue Date *
                                </Label>
                                <Input
                                    id="issueDate"
                                    type="date"
                                    {...register('issueDate')}
                                    className="text-sm"
                                />
                                {errors.issueDate && (
                                    <p className="text-xs text-red-500">{errors.issueDate.message}</p>
                                )}
                            </div>

                            {/* Dynamic Fields Based on Certificate Type */}
                            {config.fields.includes('conduct') && (
                                <div className="space-y-2">
                                    <Label htmlFor="conduct" className="text-sm">Conduct</Label>
                                    <Select
                                        value={watchedValues.conduct}
                                        onValueChange={(value) => setValue('conduct', value)}
                                    >
                                        <SelectTrigger className="text-sm">
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
                                <div className="space-y-2">
                                    <Label htmlFor="purpose" className="text-sm">Purpose</Label>
                                    <Input
                                        id="purpose"
                                        {...register('purpose')}
                                        placeholder="e.g., Bank account, Passport"
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('academicYear') && (
                                <div className="space-y-2">
                                    <Label htmlFor="academicYear" className="text-sm">Academic Year</Label>
                                    <Input
                                        id="academicYear"
                                        {...register('academicYear')}
                                        placeholder="e.g., 2023-2024"
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('dateOfLeaving') && (
                                <div className="space-y-2">
                                    <Label htmlFor="dateOfLeaving" className="text-sm">Date of Leaving</Label>
                                    <Input
                                        id="dateOfLeaving"
                                        type="date"
                                        {...register('dateOfLeaving')}
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('reason') && (
                                <div className="space-y-2">
                                    <Label htmlFor="reason" className="text-sm">Reason</Label>
                                    <Input
                                        id="reason"
                                        {...register('reason')}
                                        placeholder="Reason for leaving/transfer"
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('eventName') && (
                                <div className="space-y-2">
                                    <Label htmlFor="eventName" className="text-sm">Event/Competition Name *</Label>
                                    <Input
                                        id="eventName"
                                        {...register('eventName')}
                                        placeholder="e.g., Science Fair 2024"
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('position') && (
                                <div className="space-y-2">
                                    <Label htmlFor="position" className="text-sm">Position/Achievement</Label>
                                    <Input
                                        id="position"
                                        {...register('position')}
                                        placeholder="e.g., 1st Place, Gold Medal"
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('title') && (
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm">Certificate Title</Label>
                                    <Input
                                        id="title"
                                        {...register('title')}
                                        placeholder="Enter certificate title"
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('content') && (
                                <div className="space-y-2">
                                    <Label htmlFor="content" className="text-sm">Certificate Content</Label>
                                    <Textarea
                                        id="content"
                                        {...register('content')}
                                        placeholder="Enter certificate content..."
                                        rows={5}
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {config.fields.includes('remarks') && (
                                <div className="space-y-2">
                                    <Label htmlFor="remarks" className="text-sm">Remarks (Optional)</Label>
                                    <Textarea
                                        id="remarks"
                                        {...register('remarks')}
                                        placeholder="Any additional remarks..."
                                        rows={3}
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {/* Generate Button */}
                            <Button
                                onClick={handleSubmit(handleGeneratePDF)}
                                disabled={generating || !previewConfig}
                                className="w-full"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Generate & Download
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Section */}
                <div className="lg:sticky lg:top-4 lg:self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Preview
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {previewUrl ? 'Generated certificate preview' : 'Preview will appear after generation'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-hidden bg-muted/20 min-h-[400px] flex items-center justify-center">
                            {previewConfig ? (
                                <div className="scale-[0.6] origin-top p-4" id="certificate-preview-container">
                                    <CertificateDesignEditor
                                        initialConfig={previewConfig}
                                        readOnly={true}
                                        templateType="certificate"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Award className="h-16 w-16 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        Select a student and template to see the preview
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}