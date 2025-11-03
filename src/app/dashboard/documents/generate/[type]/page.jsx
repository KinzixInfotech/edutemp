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
        if (templates?.length > 0) {
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
            setValue('templateId', defaultTemplate.id);
        }
    }, [templates, setValue]);

    const generateMutation = useMutation({
        mutationFn: async (data) => {
            setGenerating(true);
            const res = await fetch(`/api/documents/${schoolId}/certificates/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    certificateType: config.apiType,
                    issuedById: fullUser?.id,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to generate certificate');
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success('Certificate generated successfully!');
            setPreviewUrl(data.fileUrl);
            setGenerating(false);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to generate certificate');
            setGenerating(false);
        },
    });

    const onSubmit = (data) => {
        generateMutation.mutate(data);
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
                                onClick={handleSubmit(onSubmit)}
                                disabled={generating}
                                className="w-full"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Generate Certificate
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
                        <CardContent>
                            {previewUrl ? (
                                <div className="space-y-4">
                                    <iframe
                                        src={previewUrl}
                                        className="w-full h-[500px] border rounded-lg"
                                        title="Certificate Preview"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open(previewUrl, '_blank')}
                                            className="flex-1"
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Full
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = previewUrl;
                                                link.download = `${config.title}.pdf`;
                                                link.click();
                                            }}
                                            className="flex-1"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                                    <Award className="h-16 w-16 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No Preview Yet</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        Fill in the form and click "Generate Certificate" to see the preview here
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