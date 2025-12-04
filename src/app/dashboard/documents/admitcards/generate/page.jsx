'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Loader2,
    FileText,
    Download,
    User,
    Calendar,
    Hash,
    MapPin,
    Clock,
    ArrowLeft,
    Layout
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const formSchema = z.object({
    studentId: z.string().min(1, 'Student is required'),
    examId: z.string().optional(),
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
    const [previewConfig, setPreviewConfig] = useState(null);

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

    // Get specific values for dependencies
    const studentId = watchedValues.studentId;
    const examId = watchedValues.examId;
    const templateId = watchedValues.templateId;
    const seatNumber = watchedValues.seatNumber;
    const center = watchedValues.center;
    const examDate = watchedValues.examDate;
    const examTime = watchedValues.examTime;
    const venue = watchedValues.venue;

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
        staleTime: 5 * 60 * 1000,
    });

    // Fetch exams
    const { data: exams } = useQuery({
        queryKey: ['exams', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/schools/${schoolId}/examination/exams`);
            if (!res.ok) throw new Error('Failed to fetch exams');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
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
        staleTime: 5 * 60 * 1000,
    });

    // Set default template
    useEffect(() => {
        if (templates?.length > 0 && !watchedValues.templateId) {
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
            setValue('templateId', defaultTemplate.id);
        }
    }, [templates, setValue, watchedValues.templateId]);

    // Update preview when form values or template changes
    useEffect(() => {
        if (!templates || !students || !templateId) return;

        const template = templates.find(t => t.id === templateId);
        if (!template || !template.layoutConfig) return;

        const student = students.find(s => s.userId === studentId) || {};

        const exam = exams?.find(e => e.id?.toString() === examId) || {};

        // Create a deep copy of elements to avoid mutating original
        const elements = JSON.parse(JSON.stringify(template.layoutConfig.elements || []));

        // Get student's section name
        const studentSection = student.class?.sections?.find(s => s.id === student.sectionId);
        const sectionName = studentSection?.name || student.section?.name || 'Section';

        // Replace placeholders
        const replacements = {
            '{{studentName}}': student.user?.name || student.name || 'Student Name',
            '{{rollNumber}}': student.rollNumber || 'Roll No',
            '{{admissionNo}}': student.admissionNumber || 'Adm No',
            '{{class}}': student.class?.className || 'Class',
            '{{section}}': sectionName,
            '{{dob}}': student.dob ? new Date(student.dob).toLocaleDateString() : 'DOB',
            '{{fatherName}}': student.FatherName || 'Father Name',
            '{{motherName}}': student.motherName || 'Mother Name',
            '{{address}}': student.address || 'Address',
            '{{schoolName}}': fullUser?.schoolName || fullUser?.school?.name || 'School Name',
            '{{examName}}': exam.title || exam.name || 'Exam Name',
            '{{schoolAddress}}': fullUser?.school.location || 'Location not added',
            '{{examDate}}': examDate ? new Date(examDate).toLocaleDateString() : 'Exam Date',
            '{{examTime}}': examTime || 'Exam Time',
            '{{seatNumber}}': seatNumber || 'Seat No',
            '{{center}}': center || 'Exam Center',
            '{{venue}}': venue || 'Venue',
        };

        // Image replacements (URLs)
        const imageReplacements = {
            '{{studentPhoto}}': student?.user?.profilePicture || student.photoUrl || 'https://placehold.co/100x100?text=Photo',
            '{{schoolLogo}}': fullUser?.school?.profilePicture || 'https://placehold.co/100x100?text=Logo',
            '{{principalSignature}}': fullUser?.school?.signatureUrl || fullUser?.school?.signature || 'https://placehold.co/100x50?text=Signature',
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

        const config = {
            elements: processedElements,
            canvasSize: template.layoutConfig.canvasSize || { width: 800, height: 600 },
            backgroundImage: template.layoutConfig.backgroundImage || ''
        };
        setPreviewConfig(config);

    }, [templateId, studentId, examId, seatNumber, center, examDate, examTime, venue, templates, students, exams, fullUser]);

    const handleGeneratePDF = async () => {
        const element = document.getElementById('admitcard-preview-container');
        if (!element) {
            toast.error('Preview not ready');
            return;
        }

        try {
            setGenerating(true);

            const canvasEl = element.querySelector('[class*="relative"]') || element.firstChild || element;

            const canvas = await html2canvas(canvasEl, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                allowTaint: true,
            });

            const imgData = canvas.toDataURL('image/png', 1.0);

            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const orientation = imgWidth > imgHeight ? 'l' : 'p';

            const pdf = new jsPDF({
                orientation,
                unit: 'pt',
                format: [imgWidth / 2, imgHeight / 2]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);

            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPreviewUrl(pdfUrl);

            pdf.save(`AdmitCard_${seatNumber || 'preview'}.pdf`);
            toast.success('Admit card generated and downloaded!');
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
        <div className="h-screen flex flex-col bg-background">
            {/* Header Toolbar */}
            <div className="h-14 border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/documents/admitcards')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <h1 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Generate Admit Card
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {previewUrl && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(previewUrl, '_blank')}
                        >
                            View PDF
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit(handleGeneratePDF)}
                        disabled={generating || !previewConfig}
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
                                <Label className="text-xs flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    Student *
                                </Label>
                                <Select
                                    value={studentId}
                                    onValueChange={(value) => setValue('studentId', value)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Select student..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students?.map((student) => (
                                            <SelectItem key={student.userId} value={student.userId}>
                                                <span className="text-sm">{student.user?.name || student.name}</span>
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
                                <Label className="text-xs flex items-center gap-1.5">
                                    <Layout className="h-3.5 w-3.5" />
                                    Template
                                </Label>
                                <Select
                                    value={templateId}
                                    onValueChange={(value) => setValue('templateId', value)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Select template..." />
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

                            {/* Exam Selection */}
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Exam
                                </Label>
                                <Select
                                    value={examId}
                                    onValueChange={(value) => setValue('examId', value)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Select exam..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exams?.map?.((exam) => (
                                            <SelectItem key={exam.id} value={exam.id.toString()}>
                                                {exam.title || exam.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="h-px bg-border my-2" />

                            {/* Seat Number */}
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5" />
                                    Seat Number *
                                </Label>
                                <Input
                                    {...register('seatNumber')}
                                    placeholder="e.g., A-101"
                                    className="h-9 text-sm"
                                />
                                {errors.seatNumber && (
                                    <p className="text-xs text-red-500">{errors.seatNumber.message}</p>
                                )}
                            </div>

                            {/* Exam Date */}
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Exam Date *
                                </Label>
                                <Input
                                    type="date"
                                    {...register('examDate')}
                                    className="h-9 text-sm"
                                />
                                {errors.examDate && (
                                    <p className="text-xs text-red-500">{errors.examDate.message}</p>
                                )}
                            </div>

                            {/* Exam Time */}
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Exam Time
                                </Label>
                                <Input
                                    type="time"
                                    {...register('examTime')}
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Center */}
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    Exam Center
                                </Label>
                                <Input
                                    {...register('center')}
                                    placeholder="e.g., Main Campus"
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Venue */}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Venue/Room</Label>
                                <Input
                                    {...register('venue')}
                                    placeholder="e.g., Room 201"
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Side - Preview Canvas */}
                <div className="flex-1 bg-muted/30 overflow-auto" id="admitcard-preview-container">
                    {!previewConfig ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                            <p className="text-sm text-muted-foreground">
                                Select a template to see the preview
                            </p>
                        </div>
                    ) : (
                        <div className="min-h-full p-8 flex items-start justify-center">
                            <CertificateDesignEditor
                                key={JSON.stringify(previewConfig)}
                                initialConfig={previewConfig}
                                readOnly={true}
                                templateType="admitcard"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}