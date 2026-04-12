'use client';

import { useState, useEffect, useMemo } from 'react';
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
    ArrowLeft,
    Download,
    AlertCircle,
    Award
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { useAcademicYear } from '@/context/AcademicYearContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import {
    applyMappingsToTemplateElements,
    buildCertificateMappingContext,
    buildResolvedMappings,
    extractTemplatePlaceholders,
} from '@/lib/certificate-template-mapping';

const formSchema = z.object({
    classId: z.string().min(1, 'Class is required'),
    sectionId: z.string().optional(),
    templateId: z.string().min(1, 'Template is required'),
    issueDate: z.string().default(() => new Date().toISOString().split('T')[0]),
    startingNumber: z.number().min(1).default(1),
    showToParent: z.boolean().default(false),
});

export default function BulkGenerateCertificatesPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const { selectedYear } = useAcademicYear();
    const academicYearId = selectedYear?.id;
    const schoolId = fullUser?.schoolId;
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [previewConfig, setPreviewConfig] = useState(null);
    const [generationConfig, setGenerationConfig] = useState(null);
    const [studentCount, setStudentCount] = useState(0);
    const [loadingCount, setLoadingCount] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');

    // Error Reporting State
    const [failedStudents, setFailedStudents] = useState([]);
    const [showReport, setShowReport] = useState(false);

    const {
        handleSubmit,
        watch,
        register,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            classId: '',
            sectionId: '',
            templateId: '',
            issueDate: new Date().toISOString().split('T')[0],
            startingNumber: 1,
            showToParent: false,
        },
    });

    const watchedValues = watch();
    // Reusing the ZIP uploader - accepts blob up to 32MB
    const { startUpload } = useR2Upload({ folder: 'documents' });

    // Fetch classes
    const { data: classes, isLoading: loadingClasses } = useQuery({
        queryKey: ['classes', schoolId, academicYearId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const params = new URLSearchParams();
            if (academicYearId) params.append('academicYearId', academicYearId);
            const res = await fetch(`/api/schools/${schoolId}/classes?${params}`);
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

    // Fetch templates
    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ['certificate-templates-all', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('Invalid configuration');
            const res = await fetch(`/api/documents/${schoolId}/certificate-templates`);
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const filteredTemplates = useMemo(() => {
        if (!templateSearch.trim()) return templates || [];
        const search = templateSearch.toLowerCase();
        return (templates || []).filter((template) =>
            [template.name, template.description, template.type]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search))
        );
    }, [templateSearch, templates]);

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
                    limit: '1',
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

    // Update preview
    useEffect(() => {
        if (!templates || !watchedValues.templateId) {
            setPreviewConfig(null);
            return;
        }

        const template = templates.find(t => t.id === watchedValues.templateId);
        if (!template || !template.layoutConfig) {
            setPreviewConfig(null);
            return;
        }

        const cls = classes?.find(c => c.id.toString() === watchedValues.classId) || {};
        const section = sections?.find(s => s.id.toString() === watchedValues.sectionId) || {};

        const sampleStudent = {
            name: 'John Doe (Sample)',
            rollNumber: '12345',
            admissionNo: 'ADM001',
            className: cls.className || 'Class X',
            section: section.name || 'A',
            dob: '2010-01-01',
            fatherName: 'Robert Doe',
            motherName: 'Jane Doe',
            photo: 'https://placehold.co/100x100?text=Photo',
        };
        const placeholderKeys = extractTemplatePlaceholders(template.layoutConfig.elements || []);
        const mappingContext = buildCertificateMappingContext({
            student: sampleStudent,
            formValues: {
                ...watchedValues,
                conductLabel: 'Good',
                conduct: 'Good',
                reason: watchedValues.reason || 'Completed Studies',
                academicYear: watchedValues.academicYear || '2023-2024',
            },
            fullUser,
            selectedYear,
            certificateMeta: {
                certificateNumber: 'CERT-SAMPLE-001',
                tcNumber: 'TC-SAMPLE-001',
                verificationUrl: 'https://example.com/verify/sample',
            },
        });
        const resolvedMappings = buildResolvedMappings(placeholderKeys, mappingContext);

        setPreviewConfig({
            elements: applyMappingsToTemplateElements(
                JSON.parse(JSON.stringify(template.layoutConfig.elements || [])),
                resolvedMappings
            ),
            canvasSize: template.layoutConfig.canvasSize,
            backgroundImage: template.layoutConfig.backgroundImage,
            backgroundAsset: template.layoutConfig.backgroundAsset || null,
        });

    }, [templates, classes, sections, watchedValues, fullUser, selectedYear]);


    const generateCertificates = async (data) => {
        const failures = [];
        const generatedCertificates = [];
        setFailedStudents([]);
        setShowReport(false);

        try {
            setGenerating(true);
            setProgress(0);
            setStatusMessage('Fetching student data...');

            const res = await fetch(`/api/documents/${schoolId}/certificates/bulk-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error('Failed to fetch data');
            const { students, template, count } = await res.json();

            if (!students || students.length === 0) {
                toast.error('No students found');
                setGenerating(false);
                return;
            }

            setStatusMessage(`Preparing ${count} certificates...`);

            const zip = new JSZip();
            const dateStr = new Date().toISOString().split('T')[0];
            const folder = zip.folder(`Certificates-${template.name}-${dateStr}`);

            for (let i = 0; i < students.length; i++) {
                try {
                    const student = students[i];
                    const placeholderKeys = extractTemplatePlaceholders(template.layoutConfig.elements || []);
                    const mappingContext = buildCertificateMappingContext({
                        student,
                        formValues: {
                            ...data,
                            conductLabel: data.conduct || 'Good',
                            academicYear: data.academicYear || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
                        },
                        fullUser,
                        selectedYear,
                        certificateMeta: {
                            certificateNumber: `CERT-${Date.now()}-${i + 1}`,
                            tcNumber: `TC-${Date.now()}-${i + 1}`,
                            verificationUrl: '',
                        },
                    });
                    const resolvedMappings = buildResolvedMappings(placeholderKeys, mappingContext);

                    const studentConfig = {
                        elements: applyMappingsToTemplateElements(
                            JSON.parse(JSON.stringify(template.layoutConfig.elements)),
                            resolvedMappings
                        ),
                        canvasSize: template.layoutConfig.canvasSize,
                        backgroundImage: template.layoutConfig.backgroundImage,
                        backgroundAsset: template.layoutConfig.backgroundAsset || null,
                    };

                    setGenerationConfig(studentConfig);
                    await new Promise(resolve => setTimeout(resolve, 300));

                    const element = document.getElementById('certificate-generation-canvas');
                    if (element) {
                        const dataUrl = await toPng(element, {
                            quality: 0.95,
                            skipFonts: true,
                            preferCanvas: true
                        });

                        const width = template.layoutConfig.canvasSize.width;
                        const height = template.layoutConfig.canvasSize.height;
                        // A4 roughly 595 x 842 pt
                        // Adjust based on canvasSize logic from generate page
                        const pdf = new jsPDF({
                            orientation: width > height ? 'landscape' : 'portrait',
                            unit: 'px',
                            format: [width, height]
                        });

                        pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
                        const pdfBlob = pdf.output('blob');

                        folder.file(`${student.rollNumber || 'student'}-${student.name}.pdf`, pdfBlob);

                        generatedCertificates.push({
                            studentId: student.id,
                            customFields: {
                                layoutConfig: studentConfig // Store basic snapshot
                            },
                        });
                    }
                } catch (err) {
                    console.error('Err:', err);
                    failures.push({ name: students[i].name, reason: err.message });
                }
                setProgress(Math.round(((i + 1) / students.length) * 100));
            }

            setStatusMessage('Compressing...');
            const zipContent = await zip.generateAsync({ type: 'blob' });
            saveAs(zipContent, `Certificates-${template.name}.zip`);

            // Upload
            if (generatedCertificates.length > 0) {
                setStatusMessage('Uploading history...');
                const zipFile = new File([zipContent], `Certificates-${template.name}-${Date.now()}.zip`, { type: "application/zip" });
                const uploadRes = await startUpload([zipFile]);

                if (uploadRes && uploadRes[0]) {
                    const histRes = await fetch(`/api/documents/${schoolId}/certificates/history`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            templateId: data.templateId,
                            zipUrl: uploadRes[0].url,
                            students: generatedCertificates
                        })
                    });

                    if (!histRes.ok) {
                        const errData = await histRes.json();
                        console.error("History Save Error:", errData);
                        throw new Error(errData.message || errData.error || 'Failed to save to history');
                    }
                    toast.success('Saved to history');
                }
            }

            if (failures.length > 0) {
                setFailedStudents(failures);
                setShowReport(true);
            } else {
                toast.success('All generated!');
            }

        } catch (error) {
            console.error(error);
            toast.error('Error: ' + error.message);
        } finally {
            setGenerating(false);
            setGenerationConfig(null);
            setProgress(0);
        }
    };

    if (!schoolId || loadingClasses || loadingTemplates) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden relative">
            {/* Same Error/Loading Overlays as Admit Card (simplified) */}
            {generating && (
                <div className="absolute inset-0 z-50 bg-background/80 flex flex-col items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                            <CardTitle>{statusMessage}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Progress value={progress} className="h-2" />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Hidden Canvas */}
            <div className="absolute top-0 left-0 -z-50" style={{ position: 'fixed', left: '-10000px', top: 0 }}>
                {generationConfig && (
                    <div id="certificate-generation-canvas" style={{ width: generationConfig.canvasSize?.width, height: generationConfig.canvasSize?.height }}>
                        <CertificateDesignEditor initialConfig={generationConfig} readOnly={true} templateType="certificate" />
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="h-14 border-b bg-background flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/documents/certificates/history')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="font-semibold text-lg flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Bulk Generate Certificates
                    </h1>
                </div>
                <Button onClick={handleSubmit(generateCertificates)} disabled={generating}>
                    <Download className="mr-2 h-4 w-4" />
                    Generate ZIP
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                <div className="w-80 border-r bg-background flex-shrink-0 p-4 space-y-4">
                    {/* Form Inputs */}
                    <div className="space-y-1.5">
                        <Label>Select Template *</Label>
                        <Input
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            placeholder="Search templates..."
                        />
                        <Select value={watchedValues.templateId} onValueChange={(v) => setValue('templateId', v)}>
                            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                            <SelectContent>
                                {filteredTemplates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Select Class *</Label>
                        <Select value={watchedValues.classId} onValueChange={(v) => setValue('classId', v)}>
                            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                            <SelectContent>
                                {classes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.className}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Select Section</Label>
                        <Select value={watchedValues.sectionId} onValueChange={(v) => setValue('sectionId', v)}>
                            <SelectTrigger><SelectValue placeholder="All Sections" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Sections</SelectItem>
                                {sections?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Issue Date</Label>
                        <Input type="date" {...register("issueDate")} />
                    </div>

                    <div className="h-px bg-border my-2" />

                    {/* Parent Sharing */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Share with Parents</Label>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Push to Parents</Label>
                                <p className="text-[10px] text-muted-foreground">
                                    Send notification & make visible in parent app
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={watchedValues.showToParent || false}
                                onChange={(e) => setValue('showToParent', e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-muted/30 p-8 flex justify-center overflow-auto">
                    {previewConfig ? (
                        <div className="scale-75 origin-top">
                            <CertificateDesignEditor initialConfig={previewConfig} readOnly={true} templateType="certificate" />
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground mt-20">Select options to preview</div>
                    )}
                </div>
            </div>
        </div>
    );
}
