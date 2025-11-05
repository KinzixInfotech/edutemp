'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Save,
    Loader2,
    FileText,
    Download,
    Users,
    Calendar,
    MapPin,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';

const formSchema = z.object({
    examId: z.string().min(1, 'Exam is required'),
    classId: z.string().min(1, 'Class is required'),
    sectionId: z.string().optional(),
    templateId: z.string().optional(),
    examDate: z.string().min(1, 'Exam date is required'),
    examTime: z.string().optional(),
    center: z.string().optional(),
    venue: z.string().optional(),
    seatNumberPrefix: z.string().default(''),
    startingSeatNumber: z.number().min(1).default(1),
});

export default function BulkGenerateAdmitCardsPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [generatedCount, setGeneratedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [results, setResults] = useState(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            examId: '',
            classId: '',
            sectionId: '',
            templateId: '',
            examDate: new Date().toISOString().split('T')[0],
            examTime: '',
            center: '',
            venue: '',
            seatNumberPrefix: '',
            startingSeatNumber: 1,
        },
    });

    const watchedValues = watch();

    // Fetch classes
    const { data: classes, isLoading: loadingClasses } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/classes?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch classes');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch sections based on selected class
    const { data: sections, isLoading: loadingSections } = useQuery({
        queryKey: ['sections', watchedValues.classId],
        queryFn: async () => {
            if (!watchedValues.classId) return [];
            const res = await fetch(`/api/sections?classId=${watchedValues.classId}`);
            if (!res.ok) throw new Error('Failed to fetch sections');
            return res.json();
        },
        enabled: !!watchedValues.classId,
    });

    // Fetch exams
    const { data: exams, isLoading: loadingExams } = useQuery({
        queryKey: ['exams', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/exams?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch exams');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch admit card templates
    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ['admitcard-templates', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('Invalid configuration');
            const res = await fetch(`/api/documents/${schoolId}/admitcard-templates`);
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Get default template
    useEffect(() => {
        if (templates?.length > 0) {
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
            setValue('templateId', defaultTemplate.id);
        }
    }, [templates, setValue]);

    const bulkGenerateMutation = useMutation({
        mutationFn: async (data) => {
            setGenerating(true);
            setProgress(0);
            setGeneratedCount(0);

            const res = await fetch(`/api/documents/${schoolId}/admitcards/bulk-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    issuedById: fullUser?.id,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to generate admit cards');
            }
            return res.json();
        },
        onSuccess: (data) => {
            setResults(data);
            setProgress(100);
            toast.success(`Successfully generated ${data.successCount} admit cards!`);
            setGenerating(false);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to generate admit cards');
            setGenerating(false);
        },
    });

    const onSubmit = (data) => {
        bulkGenerateMutation.mutate(data);
    };

    if (!schoolId || loadingClasses || loadingExams || loadingTemplates) {
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
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                            <span>Bulk Generate Admit Cards</span>
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
                        Generate admit cards for entire class or section
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Form Section */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Bulk Generation Settings</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Configure settings for bulk admit card generation
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Exam Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="examId" className="text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Select Exam *
                                </Label>
                                <Select
                                    value={watchedValues.examId}
                                    onValueChange={(value) => setValue('examId', value)}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Choose an exam..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exams?.map((exam) => (
                                            <SelectItem key={exam.id} value={exam.id.toString()}>
                                                {exam.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.examId && (
                                    <p className="text-xs text-red-500">{errors.examId.message}</p>
                                )}
                            </div>

                            {/* Class Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="classId" className="text-sm flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Select Class *
                                </Label>
                                <Select
                                    value={watchedValues.classId}
                                    onValueChange={(value) => {
                                        setValue('classId', value);
                                        setValue('sectionId', '');
                                    }}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Choose a class..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes?.map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id.toString()}>
                                                {cls.className}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.classId && (
                                    <p className="text-xs text-red-500">{errors.classId.message}</p>
                                )}
                            </div>

                            {/* Section Selection (Optional) */}
                            {watchedValues.classId && (
                                <div className="space-y-2">
                                    <Label htmlFor="sectionId" className="text-sm">
                                        Select Section (Optional)
                                    </Label>
                                    <Select
                                        value={watchedValues.sectionId}
                                        onValueChange={(value) => setValue('sectionId', value)}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue placeholder="All sections..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All Sections</SelectItem>
                                            {sections?.map((section) => (
                                                <SelectItem key={section.id} value={section.id.toString()}>
                                                    Section {section.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Template Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="templateId" className="text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Admit Card Template
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

                            {/* Exam Date */}
                            <div className="space-y-2">
                                <Label htmlFor="examDate" className="text-sm flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Exam Date *
                                </Label>
                                <Input
                                    id="examDate"
                                    type="date"
                                    {...register('examDate')}
                                    className="text-sm"
                                />
                                {errors.examDate && (
                                    <p className="text-xs text-red-500">{errors.examDate.message}</p>
                                )}
                            </div>

                            {/* Exam Time */}
                            <div className="space-y-2">
                                <Label htmlFor="examTime" className="text-sm flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Exam Time
                                </Label>
                                <Input
                                    id="examTime"
                                    type="time"
                                    {...register('examTime')}
                                    className="text-sm"
                                />
                            </div>

                            {/* Center */}
                            <div className="space-y-2">
                                <Label htmlFor="center" className="text-sm">Examination Center</Label>
                                <Input
                                    id="center"
                                    {...register('center')}
                                    placeholder="e.g., Main Campus"
                                    className="text-sm"
                                />
                            </div>

                            {/* Venue */}
                            <div className="space-y-2">
                                <Label htmlFor="venue" className="text-sm flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Venue/Building
                                </Label>
                                <Input
                                    id="venue"
                                    {...register('venue')}
                                    placeholder="e.g., Block A"
                                    className="text-sm"
                                />
                            </div>

                            {/* Seat Number Configuration */}
                            <div className="border-t pt-4 space-y-4">
                                <h3 className="text-sm font-semibold">Seat Number Configuration</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="seatNumberPrefix" className="text-sm">
                                        Seat Number Prefix
                                    </Label>
                                    <Input
                                        id="seatNumberPrefix"
                                        {...register('seatNumberPrefix')}
                                        placeholder="e.g., A- or blank"
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="startingSeatNumber" className="text-sm">
                                        Starting Seat Number
                                    </Label>
                                    <Input
                                        id="startingSeatNumber"
                                        type="number"
                                        {...register('startingSeatNumber', { valueAsNumber: true })}
                                        min="1"
                                        className="text-sm"
                                    />
                                </div>

                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        Seat numbers will be generated as: {watchedValues.seatNumberPrefix}{watchedValues.startingSeatNumber}, {watchedValues.seatNumberPrefix}{watchedValues.startingSeatNumber + 1}, etc.
                                    </AlertDescription>
                                </Alert>
                            </div>

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
                                        Generate Admit Cards
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Progress/Results Section */}
                <div className="lg:sticky lg:top-4 lg:self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">
                                {generating ? 'Generation Progress' : results ? 'Generation Results' : 'Ready to Generate'}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {generating ? 'Please wait while admit cards are being generated...' :
                                    results ? 'Bulk generation completed' :
                                        'Fill the form and click generate to start'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {generating && (
                                <div className="space-y-4">
                                    <Progress value={progress} className="w-full" />
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Generated {generatedCount} of {totalCount} admit cards
                                        </p>
                                    </div>
                                </div>
                            )}

                            {results && (
                                <div className="space-y-4">
                                    <Alert className="bg-green-50 border-green-200">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertTitle className="text-green-800">Success!</AlertTitle>
                                        <AlertDescription className="text-green-700 text-sm">
                                            Successfully generated {results.successCount} admit cards
                                        </AlertDescription>
                                    </Alert>

                                    {results.failedCount > 0 && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Partial Failure</AlertTitle>
                                            <AlertDescription className="text-sm">
                                                {results.failedCount} admit cards failed to generate
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-2">
                                        <Button
                                            onClick={() => window.open(results.zipUrl, '_blank')}
                                            className="w-full"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download All as ZIP
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push('/dashboard/documents/admitcards/history')}
                                            className="w-full"
                                        >
                                            View History
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!generating && !results && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Users className="h-16 w-16 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Ready to Generate</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        Configure the settings and click "Generate Admit Cards" to start bulk generation
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