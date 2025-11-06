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
    Eye,
    Download,
    User,
    Calendar,
    Hash,
    MapPin,
    Clock,
    ArrowLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

const formSchema = z.object({
    studentId: z.string().min(1, 'Student is required'),
    examId: z.string().min(1, 'Exam is required'),
    templateId: z.string().optional(),
    seatNumber: z.string().min(1, 'Seat number is required'),
    center: z.string().optional(),
    examDate: z.string().min(1, 'Exam date is required'),
    examTime: z.string().optional(),
    venue: z.string().optional(),
});

export default function GenerateAdmitCardPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [generating, setGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [generatedCard, setGeneratedCard] = useState(null);

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
            examId: '',
            templateId: '',
            seatNumber: '',
            center: '',
            examDate: new Date().toISOString().split('T')[0],
            examTime: '',
            venue: '',
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

    // Fetch templates
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

    // Set default template
    useEffect(() => {
        if (templates?.length > 0) {
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
            setValue('templateId', defaultTemplate.id);
        }
    }, [templates, setValue]);

    const generateMutation = useMutation({
        mutationFn: async (data) => {
            setGenerating(true);
            const res = await fetch(`/api/documents/${schoolId}/admitcards/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    issuedById: fullUser?.id,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to generate admit card');
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success('Admit card generated successfully!');
            setPreviewUrl(data.fileUrl);
            setGeneratedCard(data);
            setGenerating(false);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to generate admit card');
            setGenerating(false);
        },
    });

    const onSubmit = (data) => {
        generateMutation.mutate(data);
    };

    if (!schoolId || loadingStudents || loadingExams || loadingTemplates) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const selectedStudent = students?.find(s => s.userId === watchedValues.studentId);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/dashboard/documents/admitcards/history')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                            <span>Generate Admit Card</span>
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
                        Issue admit card for student examination
                    </p>
                </div>
                {previewUrl && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => window.open(previewUrl, '_blank')}
                            size="sm"
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            View Full
                        </Button>
                        <Button
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = previewUrl;
                                link.download = `admit-card-${generatedCard?.seatNumber}.pdf`;
                                link.click();
                            }}
                            size="sm"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    </div>
                )}
            </div>

            {/* Form Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Student & Exam Details</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Fill in the required information to generate admit card
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                        {/* Template Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="templateId" className="text-sm flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Template
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

                        {/* Seat Number */}
                        <div className="space-y-2">
                            <Label htmlFor="seatNumber" className="text-sm flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                Seat Number *
                            </Label>
                            <Input
                                id="seatNumber"
                                {...register('seatNumber')}
                                placeholder="e.g., A-101"
                                className="text-sm"
                            />
                            {errors.seatNumber && (
                                <p className="text-xs text-red-500">{errors.seatNumber.message}</p>
                            )}
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
                                Venue/Room
                            </Label>
                            <Input
                                id="venue"
                                {...register('venue')}
                                placeholder="e.g., Room 201, Block A"
                                className="text-sm"
                            />
                        </div>
                    </div>

                    {/* Selected Student Info */}
                    {selectedStudent && (
                        <div className="mt-6 p-4 bg-muted rounded-lg">
                            <h3 className="text-sm font-semibold mb-2">Selected Student Details</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Name</p>
                                    <p className="font-medium">{selectedStudent.name}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Roll Number</p>
                                    <p className="font-medium">{selectedStudent.rollNumber}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Class</p>
                                    <p className="font-medium">{selectedStudent.class?.className}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Section</p>
                                    <p className="font-medium">{selectedStudent.section?.name || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Generate Button */}
                    <div className="mt-6 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard/documents/admitcards/history')}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit(onSubmit)}
                            disabled={generating}
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Generate Admit Card
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Preview Section */}
            {previewUrl && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Generated Admit Card Preview
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Preview and download the generated admit card
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <iframe
                            src={previewUrl}
                            className="w-full h-[600px] border rounded-lg"
                            title="Admit Card Preview"
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}