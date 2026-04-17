'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
import { useAcademicYear } from '@/context/AcademicYearContext';

import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import {
    applyMappingsToTemplateElements,
    buildResolvedTemplateConfig,
    buildDocumentMappingContext,
} from '@/lib/certificate-template-mapping';
import { createPdfBlobFromLayout, downloadPdfFromLayout } from '@/lib/client-document-pdf';

const formSchema = z.object({
    studentId: z.string().min(1, 'Student is required'),
    examId: z.string().optional(),
    templateId: z.string().optional(),
    seatNumber: z.string().min(1, 'Seat number is required'),
    center: z.string().optional(),
    examDate: z.string().min(1, 'Exam date is required'),
    examTime: z.string().optional(),
    venue: z.string().optional(),
    showToParent: z.boolean().default(false),
});

export default function GenerateAdmitCardPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const { selectedYear } = useAcademicYear();
    const academicYearId = selectedYear?.id;
    const [generating, setGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewConfig, setPreviewConfig] = useState(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const lastExamIdRef = useRef(null);

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
            showToParent: false,
        },
    });

    const watchedValues = watch();
    // const { startUpload } = useUploadThing("admitCardPdf"); // Removed for server-side upload

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
        queryKey: ['students', schoolId, academicYearId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const params = new URLSearchParams({ schoolId });
            if (academicYearId) params.append('academicYearId', academicYearId);
            params.append('all', 'true');
            const res = await fetch(`/api/students?${params}`);
            if (!res.ok) throw new Error('Failed to fetch students');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
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

    // Fetch exams
    const { data: exams } = useQuery({
        queryKey: ['exams', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const params = new URLSearchParams({ all: 'true' });
            if (academicYearId) params.append('academicYearId', academicYearId);
            const res = await fetch(`/api/schools/${schoolId}/examination/exams?${params}`);
            if (!res.ok) throw new Error('Failed to fetch exams');
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

    // Fetch templates
    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ['admitcard-templates', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('Invalid configuration');
            const res = await fetch(`/api/documents/${schoolId}/admitcard-templates?all=true`);
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    // Update preview when form values or template changes
    useEffect(() => {
        if (!templates || !students || !templateId) return;

        const template = templates.find(t => t.id === templateId);
        if (!template || !template.layoutConfig) return;

        const student = students.find(s => s.userId === studentId) || {};
        const exam = exams?.find(e => e.id?.toString() === examId) || {};
        const mappingContext = buildDocumentMappingContext({
            student,
            exam,
            formValues: {
                seatNumber,
                center,
                examDate,
                examTime,
                venue,
            },
            fullUser,
            selectedYear,
            docSettings,
            certificateMeta: {
                studentId,
                verificationUrl: typeof window !== 'undefined'
                    ? `${window.location.origin}/verify/admitcard?studentId=${studentId}&examId=${examId}&seat=${seatNumber}`
                    : '',
            },
        });
        const resolvedLayout = buildResolvedTemplateConfig({
            layoutConfig: template.layoutConfig,
            context: {
                ...mappingContext,
                __examSubjects: exam?.subjects || [],
            },
        });

        const config = {
            ...resolvedLayout,
            canvasSize: resolvedLayout.canvasSize || { width: 800, height: 600 },
            backgroundImage: resolvedLayout.backgroundImage || '',
            backgroundAsset: resolvedLayout.backgroundAsset || null,
            backgroundColor: resolvedLayout.backgroundColor || '#ffffff',
            customFonts: resolvedLayout.customFonts || [],
        };
        setPreviewConfig(config);

    }, [templateId, studentId, examId, seatNumber, center, examDate, examTime, venue, templates, students, exams, fullUser, docSettings]);

    const handleGeneratePDF = async (data) => {
        if (!previewConfig) {
            toast.error('Preview not ready');
            return;
        }

        try {
            setGenerating(true);

            // Save locally
            const fileName = `AdmitCard_${seatNumber || 'preview'}.pdf`;
            await downloadPdfFromLayout(previewConfig, fileName);
            const pdfBlob = await createPdfBlobFromLayout(previewConfig);
            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPreviewUrl(pdfUrl);

            // Upload and Save to History via Server-Side Upload
            const pdfFile = new File([pdfBlob], `AdmitCard-${studentId}-${seatNumber || 'single'}.pdf`, { type: "application/pdf" });

            toast.message('Generating and Saving...');

            const formData = new FormData();
            formData.append('file', pdfFile);

            const payload = {
                examId: examId || undefined,
                zipUrl: null,
                showToParent: data.showToParent || false,
                students: [{
                    studentId,
                    seatNumber: seatNumber || '',
                    center: center || '',
                    layoutConfig: previewConfig,
                    // fileUrl will be set by server
                }]
            };
            formData.append('data', JSON.stringify(payload));

            const res = await fetch(`/api/documents/${schoolId}/admitcards/history`, {
                method: 'POST',
                // Content-Type header is explicitly NOT set so browser sets multipart/form-data with boundary
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to save to history');
            }

            toast.success('Admit card saved to history', {
                action: {
                    label: 'View History',
                    onClick: () => router.push('/dashboard/documents/admitcards/history')
                }
            });

        } catch (error) {
            console.error('PDF generation error:', error);
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
                                                    <span className="text-sm">{student.user?.name || student.name}</span>
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

                            <div className="h-px bg-border my-2" />

                            {/* Parent Sharing */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Share with Parents</h3>
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">Push to Parents</Label>
                                        <p className="text-[10px] text-muted-foreground">
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
