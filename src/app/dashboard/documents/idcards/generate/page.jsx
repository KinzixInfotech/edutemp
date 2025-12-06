'use client';

import { useState, useEffect } from 'react';
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
    Loader2,
    FileText,
    Users,
    Download,
    ArrowLeft,
    CreditCard,
    User,
    Calendar,
    Layout,
    AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
    mode: z.enum(['bulk', 'single']),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    studentId: z.string().optional(),
    templateId: z.string().min(1, 'Template is required'),
    validUntil: z.string().optional(),
});

export default function GenerateIdCardPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    // State
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [generationConfig, setGenerationConfig] = useState(null); // For hidden canvas execution
    const [previewConfig, setPreviewConfig] = useState(null); // For live preview
    const [failedSIDs, setFailedSIDs] = useState([]);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            mode: 'bulk',
            classId: '',
            sectionId: '',
            studentId: '',
            templateId: '',
            validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0] // 1 year validity default
        },
    });

    const watched = watch();

    // --- DATA FETCHING ---
    const { data: classes, isLoading: loadingClasses } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            const data = await res.json();
            return data.data || data;
        },
        enabled: !!schoolId
    });

    const { data: sections } = useQuery({
        queryKey: ['sections', schoolId, watched.classId],
        queryFn: async () => {
            if (!watched.classId) return [];
            const res = await fetch(`/api/schools/${schoolId}/classes/${watched.classId}/sections`);
            const data = await res.json();
            return data.data || data;
        },
        enabled: !!schoolId && !!watched.classId
    });

    const { data: students } = useQuery({
        queryKey: ['students-list', schoolId, watched.classId, watched.sectionId],
        queryFn: async () => {
            if (!watched.classId) return [];
            let url = `/api/schools/${schoolId}/students?classId=${watched.classId}`; // Basic list
            if (watched.sectionId && watched.sectionId !== 'ALL') url += `&sectionId=${watched.sectionId}`;
            const res = await fetch(url); // Adjust if your student fetch API differs
            // Assuming this API returns a list or paginated object. 
            // We need a simple list for dropdown. If this API is heavy, we might need a lighter endpoint.
            // Using existing pattern from Admit Card page:
            const data = await res.json();
            return data.students || data.data || [];
        },
        enabled: !!schoolId && watched.mode === 'single' && !!watched.classId
    });

    const { data: singleStudentData } = useQuery({
        queryKey: ['student-details', watched.studentId],
        queryFn: async () => {
            if (!watched.studentId) return null;
            const res = await fetch(`/api/students/${watched.studentId}`); // Confirm this endpoint
            // OR use the bulk-data endpoint for one student if specific endpoint is tricky? 
            // Let's use bulk-data for consistency as it formats everything nicely
            return null;
        },
        enabled: false // We moved this logic to a direct fetch inside the effect or separate flow
    });

    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ['idcard-templates', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/${schoolId}/idcards/templates`);
            return res.json();
        },
        enabled: !!schoolId
    });

    // Default template selection
    useEffect(() => {
        if (templates?.length > 0 && !watched.templateId) {
            const def = templates.find(t => t.isDefault) || templates[0];
            setValue('templateId', def.id);
        }
    }, [templates, watched.templateId, setValue]);


    // --- PREVIEW LOGIC ---
    useEffect(() => {
        const updatePreview = async () => {
            if (!templates || !watched.templateId) return;
            const template = templates.find(t => t.id === watched.templateId);
            if (!template?.layoutConfig) return;

            let sampleStudent = {
                name: 'John Doe',
                rollNumber: '12345',
                admissionNo: 'ADM-2024-001',
                className: 'Class X',
                section: 'A',
                dob: '2010-01-01',
                fatherName: 'Robert Doe',
                address: '123 Main St, City',
                photo: 'https://placehold.co/100x100?text=Photo',
                bloodGroup: 'B+',
                emergencyContact: '9876543210'
            };

            // If Single mode and student selected, try to fetch/use real data
            if (watched.mode === 'single' && watched.studentId) {
                // Fetch simple details from the student list if available, 
                // otherwise we might need a dedicated fetch. 
                // For now, let's use the 'bulk-data' API even for single to get the formatted object
                try {
                    const res = await fetch(`/api/documents/${schoolId}/idcards/bulk-data`, {
                        method: 'POST',
                        body: JSON.stringify({ studentIds: [watched.studentId] })
                    });
                    const data = await res.json();
                    if (data.students && data.students[0]) {
                        sampleStudent = data.students[0];
                    }
                } catch (e) {
                    console.error("Failed to fetch single preview data", e);
                }
            } else if (classes && watched.classId) {
                // Update class/section in sample if selected
                const cls = classes.find(c => c.id.toString() === watched.classId);
                if (cls) sampleStudent.className = cls.className;
            }

            const elements = JSON.parse(JSON.stringify(template.layoutConfig.elements || []));
            const replacements = {
                '{{studentName}}': sampleStudent.name,
                '{{rollNumber}}': sampleStudent.rollNumber || '',
                '{{admissionNo}}': sampleStudent.admissionNo || '',
                '{{class}}': sampleStudent.className || '',
                '{{section}}': sampleStudent.section || '',
                '{{dob}}': sampleStudent.dob ? new Date(sampleStudent.dob).toLocaleDateString() : '',
                '{{fatherName}}': sampleStudent.fatherName || '',
                '{{address}}': sampleStudent.address || '',
                '{{schoolName}}': fullUser?.school?.name || 'School Name',
                '{{bloodGroup}}': sampleStudent.bloodGroup || '',
                '{{emergencyContact}}': sampleStudent.emergencyContact || '',
                '{{validUntil}}': watched.validUntil ? new Date(watched.validUntil).toLocaleDateString() : 'Valid Until'
            };

            const imageReplacements = {
                '{{studentPhoto}}': sampleStudent.photo || 'https://placehold.co/100x100?text=Photo',
                '{{schoolLogo}}': fullUser?.school?.profilePicture || 'https://placehold.co/100x100?text=Logo',
                '{{principalSignature}}': fullUser?.school?.signatureUrl || 'https://placehold.co/100x50?text=Sign',
                '{{schoolStamp}}': fullUser?.school?.stampUrl || 'https://placehold.co/100x100?text=Stamp'
            };

            const processedElements = elements.map(el => {
                if (el.type === 'text' && el.content) {
                    let content = el.content;
                    Object.entries(replacements).forEach(([key, value]) => {
                        content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
                    });
                    return { ...el, content };
                }
                if (el.type === 'image') {
                    let url = el.url;
                    Object.entries(imageReplacements).forEach(([key, value]) => {
                        if (url.includes(key) || url === key) url = value;
                    });
                    if (el.url && el.url.startsWith('{{') && !url) url = 'https://placehold.co/100x100?text=Img';
                    return { ...el, url };
                }
                return el;
            });

            setPreviewConfig({
                elements: processedElements,
                canvasSize: template.layoutConfig.canvasSize,
                backgroundImage: template.layoutConfig.backgroundImage
            });
        };

        const timeout = setTimeout(updatePreview, 500); // Debounce
        return () => clearTimeout(timeout);
    }, [watched.templateId, watched.mode, watched.classId, watched.studentId, watched.validUntil, templates, classes, fullUser, schoolId]);


    // --- GENERATION LOGIC ---
    const handleGenerate = async () => {
        try {
            setGenerating(true);
            setProgress(0);
            setStatusMessage('Fetching data...');
            setFailedSIDs([]);

            // 1. Fetch Data
            let body = {};
            if (watched.mode === 'bulk') {
                body = { classId: watched.classId, sectionId: watched.sectionId === 'ALL' ? undefined : watched.sectionId };
            } else {
                body = { studentIds: [watched.studentId] };
            }

            const res = await fetch(`/api/documents/${schoolId}/idcards/bulk-data`, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            const { students } = await res.json();

            if (!students?.length) {
                toast.error("No students found");
                setGenerating(false);
                return;
            }

            const template = templates.find(t => t.id === watched.templateId);
            setStatusMessage(`Generating ${students.length} cards...`);

            // 2. Prepare Zip
            const zip = new JSZip();
            const folder = zip.folder(`IDCards-${new Date().toISOString().split('T')[0]}`);
            const generatedCardsData = [];
            const timestamp = Date.now();
            const failures = [];

            // Helper to process element replacements (duplicated for self-contained robustness)
            const processElements = (elements, student) => {
                const replacements = {
                    '{{studentName}}': student.name,
                    '{{rollNumber}}': student.rollNumber || '',
                    '{{admissionNo}}': student.admissionNo || '',
                    '{{class}}': student.className || '',
                    '{{section}}': student.section || '',
                    '{{dob}}': student.dob ? new Date(student.dob).toLocaleDateString() : '',
                    '{{fatherName}}': student.fatherName || '',
                    '{{address}}': student.address || '',
                    '{{schoolName}}': fullUser?.school?.name || '',
                    '{{bloodGroup}}': student.bloodGroup || '',
                    '{{emergencyContact}}': student.emergencyContact || '',
                    '{{validUntil}}': watched.validUntil ? new Date(watched.validUntil).toLocaleDateString() : ''
                };
                const imageReplacements = {
                    '{{studentPhoto}}': student.photo || 'https://placehold.co/100x100?text=Photo',
                    '{{schoolLogo}}': fullUser?.school?.profilePicture || 'https://placehold.co/100x100?text=Logo',
                    '{{principalSignature}}': fullUser?.school?.signatureUrl || 'https://placehold.co/100x50?text=Sign',
                    '{{schoolStamp}}': fullUser?.school?.stampUrl || 'https://placehold.co/100x100?text=Stamp'
                };

                return elements.map(el => {
                    if (el.type === 'text' && el.content) {
                        let content = el.content;
                        Object.entries(replacements).forEach(([key, value]) => {
                            content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
                        });
                        return { ...el, content };
                    }
                    if (el.type === 'image') {
                        let url = el.url;
                        Object.entries(imageReplacements).forEach(([key, value]) => {
                            if (url && (url.includes(key) || url === key)) url = value;
                        });
                        if (!url || (url.startsWith('{{'))) url = 'https://placehold.co/100x100?text=Img';
                        return { ...el, url };
                    }
                    return el;
                });
            };

            // 3. Loop Render
            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                try {
                    const studentConfig = {
                        elements: processElements(JSON.parse(JSON.stringify(template.layoutConfig.elements)), student),
                        canvasSize: template.layoutConfig.canvasSize,
                        backgroundImage: template.layoutConfig.backgroundImage
                    };

                    setGenerationConfig(studentConfig);
                    await new Promise(r => setTimeout(r, 200)); // Render wait

                    const element = document.getElementById('id-card-generation-canvas');
                    if (element) {
                        const dataUrl = await toPng(element, { quality: 0.95, skipFonts: true });
                        const pdf = new jsPDF({
                            orientation: template.layoutConfig.canvasSize.width > template.layoutConfig.canvasSize.height ? 'landscape' : 'portrait',
                            unit: 'px',
                            format: [template.layoutConfig.canvasSize.width, template.layoutConfig.canvasSize.height]
                        });
                        pdf.addImage(dataUrl, 'PNG', 0, 0, template.layoutConfig.canvasSize.width, template.layoutConfig.canvasSize.height);
                        const pdfBlob = pdf.output('blob');

                        folder.file(`${student.rollNumber || student.name}.pdf`, pdfBlob);
                        generatedCardsData.push({
                            studentId: student.id,
                            layoutConfig: studentConfig
                        });
                    }
                } catch (err) {
                    console.error('Gen Error', err);
                    failures.push(student.name);
                }
                setProgress(Math.round(((i + 1) / students.length) * 100));
            }

            // 4. Upload
            if (generatedCardsData.length > 0) {
                setStatusMessage('Uploading...');
                const content = await zip.generateAsync({ type: 'blob' });
                const zipFile = new File([content], `IDCards-${timestamp}.zip`, { type: 'application/zip' });

                // If single file, maybe we want to offer direct download or open PDF? 
                // But keeping consistent with Bulk/History flow is safer for now.
                if (watched.mode === 'bulk') saveAs(content, `IDCards-${timestamp}.zip`);

                const formData = new FormData();
                formData.append('file', zipFile);
                formData.append('data', JSON.stringify({
                    students: generatedCardsData,
                    templateId: watched.templateId,
                    validUntil: watched.validUntil
                }));

                const saveRes = await fetch(`/api/documents/${schoolId}/idcards/history`, {
                    method: 'POST', body: formData
                });

                if (saveRes.ok) {
                    toast.success("Generated Successfully");
                    if (watched.mode === 'single' && generatedCardsData.length === 1) {
                        // Maybe find a way to open it? Rely on history for now.
                        toast("Saved to history. Check Manage tab.");
                    }
                    router.push('/dashboard/documents/idcards/manage');
                } else {
                    toast.error("Upload failed");
                }
            }

        } catch (error) {
            console.error(error);
            toast.error("Generation failed");
        } finally {
            setGenerating(false);
            setGenerationConfig(null);
            setStatusMessage('');
        }
    };

    if (loadingClasses || loadingTemplates) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-screen flex flex-col bg-background relative">
            {/* Hidden Canvas for Processing */}
            <div style={{ position: 'fixed', left: '-10000px', top: 0 }}>
                {generationConfig && (
                    <div id="id-card-generation-canvas" style={{
                        width: generationConfig.canvasSize.width,
                        height: generationConfig.canvasSize.height,
                    }}>
                        <CertificateDesignEditor initialConfig={generationConfig} readOnly={true} templateType="idcard" />
                    </div>
                )}
            </div>

            {/* Loading Overlay */}
            {generating && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-2xl">
                        <CardHeader className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                            <CardTitle>Generating ID Cards</CardTitle>
                            <CardDescription>{statusMessage}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Progress value={progress} className="h-2" />
                            <div className="text-right text-xs text-muted-foreground mt-1">{progress}%</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-background flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="font-semibold text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Generate ID Cards
                    </h1>
                </div>
                <Button onClick={handleSubmit(handleGenerate)} disabled={generating || !watched.templateId || (watched.mode === 'bulk' && !watched.classId) || (watched.mode === 'single' && !watched.studentId)}>
                    <Download className="mr-2 h-4 w-4" />
                    Generate
                </Button>
            </div>

            {/* Content Split */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Controls */}
                <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-6">

                            {/* Mode Selection */}
                            <div className="space-y-3">
                                <Label>Generation Mode</Label>
                                <Tabs value={watched.mode} onValueChange={(v) => setValue('mode', v)} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="bulk">Bulk</TabsTrigger>
                                        <TabsTrigger value="single">Single</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="space-y-4">
                                {/* Template */}
                                <div className="space-y-1.5">
                                    <Label>Template</Label>
                                    <Select value={watched.templateId} onValueChange={v => setValue('templateId', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Template" /></SelectTrigger>
                                        <SelectContent>
                                            {templates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Class/Section */}
                                <div className="space-y-1.5">
                                    <Label>Class</Label>
                                    <Select value={watched.classId} onValueChange={v => { setValue('classId', v); setValue('sectionId', ''); setValue('studentId', ''); }}>
                                        <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                        <SelectContent>
                                            {classes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.className}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Section</Label>
                                    <Select value={watched.sectionId} onValueChange={v => { setValue('sectionId', v); setValue('studentId', ''); }} disabled={!watched.classId}>
                                        <SelectTrigger><SelectValue placeholder={watched.mode === 'bulk' ? "All Sections" : "Select Section"} /></SelectTrigger>
                                        <SelectContent>
                                            {watched.mode === 'bulk' && <SelectItem value="ALL">All Sections</SelectItem>}
                                            {sections?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Student (Single Only) */}
                                {watched.mode === 'single' && (
                                    <div className="space-y-1.5">
                                        <Label>Student</Label>
                                        <Select value={watched.studentId} onValueChange={v => setValue('studentId', v)} disabled={!watched.classId}>
                                            <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                                            <SelectContent>
                                                {students?.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.rollNumber})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Valid Until */}
                                <div className="space-y-1.5">
                                    <Label>Valid Until</Label>
                                    <Input type="date" {...register('validUntil')} />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Preview */}
                <div className="flex-1 bg-muted/30 flex items-center justify-center p-8 overflow-auto">
                    {previewConfig ? (
                        <div className="shadow-xl">
                            <CertificateDesignEditor
                                initialConfig={previewConfig}
                                readOnly={true}
                                templateType="idcard"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Layout className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a template and class to preview</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
