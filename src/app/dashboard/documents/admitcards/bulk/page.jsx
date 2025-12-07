'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
    Save,
    Loader2,
    FileText,
    Users,
    Calendar,
    MapPin,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Layout,
    Download,
    XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { useUploadThing } from '@/lib/uploadthing';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';

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
    feePaidMonth: z.string().optional(),
    showToParent: z.boolean().default(false),
});

export default function BulkGenerateAdmitCardsPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [previewConfig, setPreviewConfig] = useState(null);
    const [generationConfig, setGenerationConfig] = useState(null); // Separate state for hidden generation canvas
    const [studentCount, setStudentCount] = useState(0);
    const [loadingCount, setLoadingCount] = useState(false);

    // Error Reporting State
    const [failedStudents, setFailedStudents] = useState([]);
    const [showReport, setShowReport] = useState(false);

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
            feePaidMonth: '',
            showToParent: false,
        },
    });

    const watchedValues = watch();
    // const { startUpload } = useUploadThing("bulkAdmitCardZip"); // Removed for server-side upload

    // Fetch classes
    const { data: classes, isLoading: loadingClasses } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) throw new Error('Failed to fetch classes');
            const data = await res.json();
            return data.data || data;
        },
        enabled: !!schoolId,
    });

    // Fetch sections
    const { data: sections, isLoading: loadingSections } = useQuery({
        queryKey: ['sections', schoolId, watchedValues.classId],
        queryFn: async () => {
            if (!watchedValues.classId) return [];
            const res = await fetch(`/api/schools/${schoolId}/classes/${watchedValues.classId}/sections`);
            if (!res.ok) throw new Error('Failed to fetch sections');
            const data = await res.json();
            return data.data || data;
        },
        enabled: !!schoolId && !!watchedValues.classId,
    });

    // Fetch exams
    const { data: exams, isLoading: loadingExams } = useQuery({
        queryKey: ['exams', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/schools/${schoolId}/examination/exams`);
            if (!res.ok) throw new Error('Failed to fetch exams');
            const data = await res.json();
            return data.data || data;
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
            const data = await res.json();
            return data.data || data;
        },
        enabled: !!schoolId,
    });

    // Auto-fill Exam Details
    useEffect(() => {
        if (watchedValues.examId && exams) {
            const selectedExam = exams.find(e => e.id.toString() === watchedValues.examId);
            if (selectedExam) {
                if (selectedExam.startDate) {
                    setValue('examDate', new Date(selectedExam.startDate).toISOString().split('T')[0], {
                        shouldValidate: true,
                        shouldDirty: true
                    });
                }

                // Try to get time from first subject if available
                if (selectedExam.subjects && selectedExam.subjects.length > 0) {
                    const firstSubject = selectedExam.subjects[0];
                    if (firstSubject.startTime) {
                        setValue('examTime', firstSubject.startTime, {
                            shouldValidate: true,
                            shouldDirty: true
                        });
                    }
                }
            }
        }
    }, [watchedValues.examId, exams, setValue]);

    // Fetch Student Count
    useEffect(() => {
        const fetchCount = async () => {
            if (!watchedValues.classId || !schoolId) {
                setStudentCount(0);
                return;
            }
            try {
                setLoadingCount(true);
                const queryParams = new URLSearchParams({
                    classId: watchedValues.classId,
                    limit: '1', // We only need the total count
                });

                if (watchedValues.sectionId && watchedValues.sectionId !== 'ALL') {
                    queryParams.append('sectionId', watchedValues.sectionId);
                }

                const res = await fetch(`/api/schools/${schoolId}/students?${queryParams.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setStudentCount(data.total || 0);
                }
            } catch (err) {
                console.error('Failed to fetch student count:', err);
            } finally {
                setLoadingCount(false);
            }
        };

        fetchCount();
    }, [watchedValues.classId, watchedValues.sectionId, schoolId]);


    // Set default template
    useEffect(() => {
        if (templates?.length > 0 && !watchedValues.templateId) {
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
            setValue('templateId', defaultTemplate.id);
        }
    }, [templates, setValue, watchedValues.templateId]);

    // Update preview
    useEffect(() => {
        if (!templates || !watchedValues.templateId) return;

        const template = templates.find(t => t.id === watchedValues.templateId);
        if (!template || !template.layoutConfig) return;

        const exam = exams?.find(e => e.id.toString() === watchedValues.examId) || {};
        const cls = classes?.find(c => c.id.toString() === watchedValues.classId) || {};
        const section = sections?.find(s => s.id.toString() === watchedValues.sectionId) || {};

        const elements = JSON.parse(JSON.stringify(template.layoutConfig.elements || []));

        // Format exam schedule as a table
        let examScheduleText = '';
        if (watchedValues.examId && exam.subjects && exam.subjects.length > 0) {
            // Create table rows - each subject on a new line
            exam.subjects.forEach((examSubject, index) => {
                const date = examSubject.date
                    ? new Date(examSubject.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'TBA';
                const subjectName = examSubject.subject?.subjectName || 'Subject';
                const time = examSubject.startTime && examSubject.endTime
                    ? `${examSubject.startTime} - ${examSubject.endTime}`
                    : watchedValues.examTime || 'TBA';
                const marks = examSubject.maxMarks || '100';

                // Add line break between rows
                if (index > 0) examScheduleText += '\n';
                examScheduleText += `${date}  |  ${subjectName}  |  ${time}  |  ${marks}`;
            });
        } else if (watchedValues.examId) {
            examScheduleText = `${exam.title || exam.name}\nNo subject schedule available yet`;
        } else {
            examScheduleText = '(Exam schedule will be populated during generation)';
        }

        const replacements = {
            '{{studentName}}': 'John Doe (Sample)',
            '{{rollNumber}}': '12345',
            '{{admissionNo}}': 'ADM001',
            '{{class}}': cls.className || 'Class X',
            '{{section}}': section.name || 'A',
            '{{dob}}': '2010-01-01',
            '{{fatherName}}': 'Robert Doe',
            '{{motherName}}': 'Jane Doe',
            '{{address}}': '123 School Lane',
            '{{schoolName}}': fullUser?.school?.name || fullUser?.schoolName || 'School Name',
            '{{schoolAddress}}': fullUser?.school?.location || 'School Address',
            '{{examName}}': exam.title || 'Mid Term Exam',
            '{{examDate}}': watchedValues.examDate ? new Date(watchedValues.examDate).toLocaleDateString() : '2024-01-01',
            '{{examTime}}': watchedValues.examTime || '09:00 AM',
            '{{seatNumber}}': `${watchedValues.seatNumberPrefix}${watchedValues.startingSeatNumber}`,
            '{{examSchedule}}': examScheduleText,
            '{{center}}': watchedValues.center || 'Main Hall',
            '{{venue}}': watchedValues.venue || 'Block A',
        };

        const imageReplacements = {
            '{{studentPhoto}}': 'https://placehold.co/100x100?text=Photo',
            '{{schoolLogo}}': fullUser?.school?.profilePicture || 'https://placehold.co/100x100?text=Logo',
            '{{principalSignature}}': fullUser?.school?.signatureUrl || 'https://placehold.co/100x50?text=Signature',
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
            if (el.type === 'table' && el.dataSource === 'exam_subjects') {
                // Populate table with exam subjects
                const tableData = exam.subjects && exam.subjects.length > 0
                    ? exam.subjects.map(subject => ({
                        date: subject.date
                            ? new Date(subject.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                            : '',
                        subject: subject.subject?.subjectName || '',
                        time: subject.startTime && subject.endTime
                            ? `${subject.startTime} - ${subject.endTime}`
                            : '',
                        marks: subject.maxMarks || '',
                    }))
                    : [];

                return { ...el, tableData };
            }
            return el;
        });

        setPreviewConfig({
            elements: processedElements,
            canvasSize: template.layoutConfig.canvasSize,
            backgroundImage: template.layoutConfig.backgroundImage
        });

    }, [JSON.stringify(watchedValues), templates, exams, classes, sections, fullUser]);

    const generateAdmitCards = async (data) => {
        const failures = [];
        const generatedStudents = []; // Track successes
        setFailedStudents([]);
        setShowReport(false);

        try {
            setGenerating(true);
            setProgress(0);
            setStatusMessage('Fetching student data...');

            // 1. Fetch Bulk Data
            const res = await fetch(`/api/documents/${schoolId}/admitcards/bulk-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error('Failed to fetch data');
            const { students, template, exam, count } = await res.json();

            if (!students || students.length === 0) {
                toast.error('No students found for the selected criteria');
                setGenerating(false);
                return;
            }

            setStatusMessage(`Preparing to generate ${count} admit cards...`);

            // 2. Initialize ZIP
            const zip = new JSZip();
            const folder = zip.folder(`AdmitCards-${exam.title}-${new Date().toISOString().split('T')[0]}`);

            // 3. Render and Add to ZIP
            let currentSeatNumber = data.startingSeatNumber;
            const total = students.length;

            // Helper to process replacements
            const processElements = (elements, student, seatNo) => {
                // Format exam schedule
                let examScheduleText = '';
                if (exam.subjects && exam.subjects.length > 0) {
                    exam.subjects.forEach((examSubject, index) => {
                        const date = examSubject.date
                            ? new Date(examSubject.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'TBA';
                        const subjectName = examSubject.subject?.subjectName || 'Subject';
                        const time = examSubject.startTime && examSubject.endTime
                            ? `${examSubject.startTime} - ${examSubject.endTime}`
                            : data.examTime || 'TBA';
                        const marks = examSubject.maxMarks || '100';

                        if (index > 0) examScheduleText += '\n';
                        examScheduleText += `${date}  |  ${subjectName}  |  ${time}  |  ${marks}`;
                    });
                } else {
                    examScheduleText = `${exam.title}\nNo subject schedule available`;
                }

                const replacements = {
                    '{{studentName}}': student.name,
                    '{{rollNumber}}': student.rollNumber || '',
                    '{{admissionNo}}': student.admissionNo || '',
                    '{{class}}': student.className || '',
                    '{{section}}': student.section || '',
                    '{{dob}}': student.dob ? new Date(student.dob).toLocaleDateString() : '',
                    '{{fatherName}}': student.fatherName || '',
                    '{{motherName}}': student.motherName || '',
                    '{{address}}': student.address || '',
                    '{{schoolName}}': fullUser?.school?.name || fullUser?.schoolName || '',
                    '{{schoolAddress}}': fullUser?.school?.location || '',
                    '{{examName}}': exam.title || '',
                    '{{examDate}}': data.examDate ? new Date(data.examDate).toLocaleDateString() : '',
                    '{{examTime}}': data.examTime || '',
                    '{{seatNumber}}': seatNo,
                    '{{examSchedule}}': examScheduleText,
                    '{{center}}': data.center || '',
                    '{{venue}}': data.venue || '',
                };

                const imageReplacements = {
                    '{{studentPhoto}}': student.photo || 'https://placehold.co/100x100?text=No+Photo',
                    '{{schoolLogo}}': fullUser?.school?.profilePicture || 'https://placehold.co/100x100?text=Logo',
                    '{{principalSignature}}': fullUser?.school?.signatureUrl || 'https://placehold.co/100x50?text=Signature',
                };

                return elements.map(el => {
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
                    if (el.type === 'table' && el.dataSource === 'exam_subjects') {
                        const tableData = exam.subjects && exam.subjects.length > 0
                            ? exam.subjects.map(subject => ({
                                date: subject.date
                                    ? new Date(subject.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                    : '',
                                subject: subject.subject?.subjectName || '',
                                time: subject.startTime && subject.endTime
                                    ? `${subject.startTime} - ${subject.endTime}`
                                    : '',
                                marks: subject.maxMarks || '',
                            }))
                            : [];
                        return { ...el, tableData };
                    }
                    return el;
                });
            };

            for (let i = 0; i < students.length; i++) {
                try {
                    const student = students[i];
                    const seatNo = `${data.seatNumberPrefix}${currentSeatNumber}`;

                    const studentConfig = {
                        elements: processElements(JSON.parse(JSON.stringify(template.layoutConfig.elements)), student, seatNo),
                        canvasSize: template.layoutConfig.canvasSize,
                        backgroundImage: template.layoutConfig.backgroundImage
                    };

                    // Use separate state for generation to avoid preview flicker
                    setGenerationConfig(studentConfig);

                    // Wait for render
                    await new Promise(resolve => setTimeout(resolve, 300)); // Give React time to render

                    // Capture
                    const element = document.getElementById('admit-card-generation-canvas');
                    if (element) {
                        const dataUrl = await toPng(element, {
                            quality: 0.95,
                            skipFonts: true,
                            preferCanvas: true
                        });

                        if (dataUrl.length < 100) {
                            throw new Error('Generated image is invalid (too small)');
                        }

                        // Convert to PDF
                        const width = template.layoutConfig.canvasSize.width;
                        const height = template.layoutConfig.canvasSize.height;
                        const pdf = new jsPDF({
                            orientation: width > height ? 'landscape' : 'portrait',
                            unit: 'px',
                            format: [width, height]
                        });

                        pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
                        const pdfBlob = pdf.output('blob');

                        folder.file(`${student.rollNumber || 'student'}-${student.name}.pdf`, pdfBlob);

                        // Collect successful generation data
                        generatedStudents.push({
                            studentId: student.id,
                            seatNumber: seatNo,
                            center: data.center || '',
                            layoutConfig: studentConfig,
                            // We don't have individual fileUrl since we only upload ZIP for bulk
                        });
                    }
                } catch (err) {
                    console.error(`Failed to generate admit card for student ${students[i].name}:`, err);
                    failures.push({
                        name: students[i].name,
                        rollNumber: students[i].rollNumber,
                        reason: err.message || 'Unknown error'
                    });
                }

                currentSeatNumber++;
                setProgress(Math.round(((i + 1) / total) * 100));
            }

            setStatusMessage('Compressing files...');
            const content = await zip.generateAsync({ type: 'blob' });

            // Trigger download immediately for user
            saveAs(content, `AdmitCards-${exam.title}.zip`);

            // Upload ZIP if we have any successes via Server-Side Upload
            let uploadedZipUrl = null;
            if (generatedStudents.length > 0) {
                try {
                    setStatusMessage('Preparing upload...');
                    const zipFile = new File([content], `AdmitCards-${exam.title}-${Date.now()}.zip`, { type: "application/zip" });

                    const formData = new FormData();
                    formData.append('file', zipFile);

                    const payload = {
                        examId: data.examId,
                        zipUrl: null, // Set by server
                        students: generatedStudents,
                        showToParent: data.showToParent || false,
                    };
                    formData.append('data', JSON.stringify(payload));

                    setStatusMessage('Uploading to server (this may take a while)...');
                    // We can't easily track upload progress with fetch without XHR, but detailed messages help

                    const histRes = await fetch(`/api/documents/${schoolId}/admitcards/history`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!histRes.ok) {
                        const errData = await histRes.json();
                        throw new Error(errData.message || 'Failed to save to history');
                    }

                    setStatusMessage('Finalizing records...');
                    toast.success('Saved to history successfully');

                } catch (uploadErr) {
                    console.error('Failed to upload/save history:', uploadErr);
                    toast.error('Failed to save to history (ZIP downloaded locally)');
                }
            }

            if (failures.length > 0) {
                setFailedStudents(failures);
                setShowReport(true);
                toast.warning(`Generated with ${failures.length} errors.`);
            } else {
                toast.success('All admit cards generated successfully!', {
                    action: {
                        label: 'View History',
                        onClick: () => router.push('/dashboard/documents/admitcards/history')
                    }
                });
            }

        } catch (error) {
            console.error(error);
            toast.error('Failed to generate admit cards: ' + error.message);
        } finally {
            setGenerating(false);
            setGenerationConfig(null); // Clear generation config
            setProgress(0);
            setStatusMessage('');
        }
    };

    const onSubmit = (data) => {
        generateAdmitCards(data);
    };

    if (!schoolId || loadingClasses || loadingExams || loadingTemplates) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden relative">
            {/* Error Report Modal */}
            {showReport && (
                <div className="absolute inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg shadow-2xl border-red-200 animate-in fade-in zoom-in duration-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                Generation Completed with Errors
                            </CardTitle>
                            <CardDescription>
                                {failedStudents.length} admit cards failed to generate.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-64 border rounded-md p-2 bg-muted/20">
                                {failedStudents.map((fail, idx) => (
                                    <div key={idx} className="mb-2 last:mb-0 text-sm border-b last:border-0 pb-2">
                                        <div className="flex justify-between font-medium">
                                            <span>{fail.name}</span>
                                            <span className="text-muted-foreground text-xs">{fail.rollNumber}</span>
                                        </div>
                                        <p className="text-xs text-red-500 mt-0.5">{fail.reason}</p>
                                    </div>
                                ))}
                            </ScrollArea>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => setShowReport(false)} className="w-full" variant="outline">
                                Close Report
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Generation Overlay */}
            {generating && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-2xl border-primary/20">
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            </div>
                            <CardTitle>Generating Admit Cards</CardTitle>
                            <CardDescription className="text-amber-600 font-medium">
                                ⚠️ Please do not close this tab or refresh the page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>{statusMessage}</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                This process happens entirely in your browser to ensure data privacy and speed.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Hidden Generation Canvas - Off-screen but rendered */}
            <div className="absolute top-0 left-0 -z-50" style={{ position: 'fixed', left: '-10000px', top: 0 }}>
                {generationConfig && (
                    <div
                        id="admit-card-generation-canvas"
                        style={{
                            width: generationConfig.canvasSize?.width || 800,
                            height: generationConfig.canvasSize?.height || 600,
                            overflow: 'hidden' // Ensure no scrollbars in capture
                        }}
                    >
                        <CertificateDesignEditor
                            initialConfig={generationConfig}
                            readOnly={true}
                            templateType="admitcard"
                        />
                    </div>
                )}
            </div>

            {/* Header Toolbar */}
            <div className="h-14 border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard/documents/admitcards/history')}
                        className="h-8 w-8"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <h1 className="font-semibold text-lg">Bulk Generate Admit Cards</h1>
                    </div>
                    <div className="h-6 w-px bg-border mx-2" />
                    {loadingCount ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        studentCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {studentCount} Students Selected
                            </Badge>
                        )
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleSubmit(onSubmit)}
                        disabled={generating || !watchedValues.classId || !watchedValues.examId}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Generate ZIP
                    </Button>
                </div>
            </div>

            {/* Main Content - Sidebar + Preview */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Form */}
                <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 h-full">
                        <div className="p-4 space-y-6">
                            {/* Exam Selection */}
                            <div className="space-y-1.5">
                                <Label htmlFor="examId" className="text-xs flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Select Exam *
                                </Label>
                                <Select
                                    value={watchedValues.examId}
                                    onValueChange={(value) => setValue('examId', value)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
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
                            <div className="space-y-1.5">
                                <Label htmlFor="classId" className="text-xs flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" />
                                    Select Class *
                                </Label>
                                <Select
                                    value={watchedValues.classId}
                                    onValueChange={(value) => {
                                        setValue('classId', value);
                                        setValue('sectionId', '');
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-sm">
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

                            {/* Section Selection */}
                            {watchedValues.classId && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="sectionId" className="text-xs">
                                        Select Section (Optional)
                                    </Label>
                                    <Select
                                        value={watchedValues.sectionId}
                                        onValueChange={(value) => setValue('sectionId', value)}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="All sections..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Sections</SelectItem>
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
                            <div className="space-y-1.5">
                                <Label htmlFor="templateId" className="text-xs flex items-center gap-1.5">
                                    <Layout className="h-3.5 w-3.5" />
                                    Template
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

                            <div className="h-px bg-border my-2" />

                            {/* Exam Details */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exam Details</h3>

                                <div className="space-y-1.5">
                                    <Label htmlFor="examDate" className="text-xs flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Exam Date *
                                    </Label>
                                    <Input
                                        id="examDate"
                                        type="date"
                                        {...register('examDate')}
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="examTime" className="text-xs flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        Exam Time
                                    </Label>
                                    <Input
                                        id="examTime"
                                        type="time"
                                        {...register('examTime')}
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="center" className="text-xs flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        Center
                                    </Label>
                                    <Input
                                        id="center"
                                        {...register('center')}
                                        placeholder="e.g., Main Campus"
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="venue" className="text-xs">Venue</Label>
                                    <Input
                                        id="venue"
                                        {...register('venue')}
                                        placeholder="e.g., Block A"
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-border my-2" />

                            {/* Seat Config */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seat Configuration</h3>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="seatNumberPrefix" className="text-xs">Prefix</Label>
                                        <Input
                                            id="seatNumberPrefix"
                                            {...register('seatNumberPrefix')}
                                            placeholder="e.g., A-"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="startingSeatNumber" className="text-xs">Start No.</Label>
                                        <Input
                                            id="startingSeatNumber"
                                            type="number"
                                            {...register('startingSeatNumber', { valueAsNumber: true })}
                                            min="1"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Example: {watchedValues.seatNumberPrefix}{watchedValues.startingSeatNumber}
                                </p>
                            </div>

                            <div className="h-px bg-border my-2" />

                            {/* Fee Filter */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Filter (Optional)</h3>
                                <div className="space-y-1.5">
                                    <Label htmlFor="feePaidMonth" className="text-xs">Only Fee Paid Up To</Label>
                                    <Select
                                        value={watchedValues.feePaidMonth || 'none'}
                                        onValueChange={(value) => setValue('feePaidMonth', value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="No filter (all students)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Filter</SelectItem>
                                            <SelectItem value="1">January</SelectItem>
                                            <SelectItem value="2">February</SelectItem>
                                            <SelectItem value="3">March</SelectItem>
                                            <SelectItem value="4">April</SelectItem>
                                            <SelectItem value="5">May</SelectItem>
                                            <SelectItem value="6">June</SelectItem>
                                            <SelectItem value="7">July</SelectItem>
                                            <SelectItem value="8">August</SelectItem>
                                            <SelectItem value="9">September</SelectItem>
                                            <SelectItem value="10">October</SelectItem>
                                            <SelectItem value="11">November</SelectItem>
                                            <SelectItem value="12">December</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">
                                        Only include students who have paid fees up to selected month
                                    </p>
                                </div>
                            </div>

                            <div className="h-px bg-border my-2" />

                            {/* Parent Sharing */}
                            <div className="space-y-4">
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

                {/* Right Side - Preview & Results */}
                <div className="flex-1 bg-muted/30 overflow-auto flex flex-col">
                    {/* Preview Canvas */}
                    <div className="flex-1 flex items-center justify-center p-8">
                        {!previewConfig ? (
                            <div className="flex flex-col items-center justify-center text-center">
                                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Preview Area</h3>
                                <p className="text-sm text-muted-foreground">
                                    Select options to see a sample admit card
                                </p>
                            </div>
                        ) : (
                            <div id="admit-card-preview-canvas" className="bg-white shadow-lg transition-all duration-200">
                                <CertificateDesignEditor
                                    initialConfig={previewConfig}
                                    readOnly={true}
                                    templateType="admitcard"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}