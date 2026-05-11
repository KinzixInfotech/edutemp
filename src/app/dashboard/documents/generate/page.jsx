'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import { ArrowLeft, Download, FileText, Loader2, Search, Sparkles, Users } from 'lucide-react';

import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcademicYear } from '@/context/AcademicYearContext';
import { useAuth } from '@/context/AuthContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { buildDocumentMappingContext, buildResolvedTemplateConfig } from '@/lib/shared-field-resolver';
import { createPdfBlobFromLayout } from '@/lib/client-document-pdf';

function templatePreviewImage(template) {
    return template?.previewImage || template?.layoutConfig?.backgroundImage || '';
}

export default function UnifiedDocumentGeneratePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { fullUser } = useAuth();
    const { selectedYear } = useAcademicYear();
    const schoolId = fullUser?.schoolId;
    const initialTemplateId = searchParams.get('templateId') || '';
    const [templateId, setTemplateId] = useState(initialTemplateId);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [generating, setGenerating] = useState(false);
    const [documentSeed] = useState(() => Date.now().toString().slice(-6));
    const { startUpload } = useR2Upload({ folder: 'documents/generated' });

    const previewContainerRef = useRef(null);
    const certWrapperRef = useRef(null);
    const [previewScale, setPreviewScale] = useState(1);
    const templatesQuery = useQuery({
        queryKey: ['my-document-templates'],
        queryFn: async () => {
            const res = await fetchWithAuth('/api/templates/my');
            if (!res.ok) throw new Error('Failed to load templates');
            return res.json();
        },
        staleTime: 60_000,
    });

    const selectedTemplateQuery = useQuery({
        queryKey: ['generation-template', templateId],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/templates/generation/${templateId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Template is not available');
            return data;
        },
        enabled: !!templateId,
        staleTime: 60_000,
    });

    const studentsQuery = useQuery({
        queryKey: ['document-students', schoolId, studentSearch],
        queryFn: async () => {
            if (!schoolId) return { data: [] };
            const params = new URLSearchParams({ limit: '25' });
            if (studentSearch.trim()) params.set('search', studentSearch.trim());
            const res = await fetch(`/api/schools/${schoolId}/students?${params}`);
            if (!res.ok) throw new Error('Failed to load students');
            return res.json();
        },
        enabled: !!schoolId && !!templateId,
        staleTime: 30_000,
    });

    const students = useMemo(() => {
        const raw = studentsQuery.data?.data ?? studentsQuery.data;
        return Array.isArray(raw) ? raw : [];
    }, [studentsQuery.data]);

    const effectiveSelectedStudentId = selectedStudentId || students[0]?.userId || students[0]?.id || '';
    const selectedStudent = useMemo(
        () => students.find((s) => s.userId === effectiveSelectedStudentId || s.id === effectiveSelectedStudentId),
        [students, effectiveSelectedStudentId],
    );
    const template = selectedTemplateQuery.data;

    const resolvedLayout = useMemo(() => {
        if (!template?.layoutConfig) return null;
        const sampleStudent = selectedStudent || {
            name: 'Select a student',
            rollNumber: 'ROLL-001',
            admissionNo: 'ADM-001',
            class: { className: 'Class X' },
            section: { name: 'A' },
            FatherName: 'Father Name',
            MotherName: 'Mother Name',
        };
        const context = buildDocumentMappingContext({
            student: sampleStudent,
            fullUser,
            selectedYear,
            formValues: { issueDate },
            certificateMeta: {
                certificateNumber: `DOC-${documentSeed}`,
                verificationUrl: 'https://edubreezy.com/verify/sample',
            },
        });
        return buildResolvedTemplateConfig({ layoutConfig: template.layoutConfig, context });
    }, [template, selectedStudent, fullUser, selectedYear, issueDate, documentSeed]);



    useEffect(() => {
        if (!previewContainerRef.current || !certWrapperRef.current || !resolvedLayout) return;
        const updateScale = () => {
            const container = previewContainerRef.current;
            const cert = certWrapperRef.current?.firstElementChild;
            if (!container || !cert) return;
            const availW = container.clientWidth - 48;
            const availH = container.clientHeight - 48;
            const certW = cert.scrollWidth || cert.offsetWidth;
            const certH = cert.scrollHeight || cert.offsetHeight;
            if (!certW || !certH) return;
            setPreviewScale(Math.min(availW / certW, availH / certH, 1));
        };
        // Run after paint so DOM has real dimensions
        const raf = requestAnimationFrame(updateScale);
        const observer = new ResizeObserver(updateScale);
        observer.observe(previewContainerRef.current);
        return () => { cancelAnimationFrame(raf); observer.disconnect(); };
    }, [resolvedLayout]);
    const chooseTemplate = (nextTemplateId) => {
        setTemplateId(nextTemplateId);
        router.replace(`/dashboard/documents/generate?templateId=${nextTemplateId}`);
    };

    const generateDocument = async () => {
        if (!template || !resolvedLayout) {
            toast.error('Choose a template first');
            return;
        }
        if (!selectedStudent) {
            toast.error('Select a student');
            return;
        }
        try {
            setGenerating(true);
            const pdfBlob = await createPdfBlobFromLayout(resolvedLayout);
            const studentName = selectedStudent.name || selectedStudent.user?.name || 'student';
            const fileName = `${template.documentType}-${studentName}`.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
            const pdfFile = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
            let fileUrl = null;
            try {
                const upload = await startUpload([pdfFile]);
                fileUrl = upload?.[0]?.url || null;
            } catch (error) {
                console.warn('Generated PDF could not be uploaded; local download will still work.', error);
            }
            saveAs(pdfBlob, `${fileName}.pdf`);
            await fetchWithAuth(`/api/documents/${schoolId}/generation-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template,
                    generatedById: fullUser?.id,
                    generationMode: 'single',
                    issueDate,
                    records: [{
                        studentId: selectedStudent.userId || selectedStudent.id,
                        classId: selectedStudent.classId,
                        sectionId: selectedStudent.sectionId,
                        fileUrl,
                        metadata: {
                            resolvedMappings: resolvedLayout.resolvedMappings,
                            placeholderKeys: resolvedLayout.placeholderKeys,
                        },
                    }],
                }),
            });
            queryClient.invalidateQueries({ queryKey: ['document-generation-history'] });
            toast.success('Document generated and added to history');
        } catch (error) {
            toast.error(error.message || 'Document generation failed');
        } finally {
            setGenerating(false);
        }
    };
    useEffect(() => {
        if (resolvedLayout) console.log('resolvedLayout keys:', Object.keys(resolvedLayout), resolvedLayout);
    }, [resolvedLayout]);

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-muted/20">
            <Dialog open={!templateId} onOpenChange={(open) => !open && templateId && undefined}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Choose Template</DialogTitle>
                        <DialogDescription>Select a marketplace or school-owned template to start generation.</DialogDescription>
                    </DialogHeader>
                    <TemplateChooser
                        templates={templatesQuery.data || []}
                        loading={templatesQuery.isLoading}
                        onChoose={chooseTemplate}
                    />
                </DialogContent>
            </Dialog>

            <div className="border-b bg-background">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="flex items-center gap-2 text-xl font-semibold">
                                <FileText className="h-5 w-5 text-primary" />
                                Generate Document
                            </h1>
                            <p className="text-sm text-muted-foreground">One flow for certificates, admit cards, IDs, report cards, and school documents.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setTemplateId('')}>Change Template</Button>
                        <Button onClick={generateDocument} disabled={generating || !template || !selectedStudent}>
                            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Generate PDF
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-[320px_1fr]">
                <aside className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Template</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {selectedTemplateQuery.isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading template
                                </div>
                            ) : template ? (
                                <>
                                    <div className="overflow-hidden rounded-md border bg-muted">
                                        {templatePreviewImage(template) ? (
                                            <img src={templatePreviewImage(template)} alt={template.name} className="h-36 w-full object-cover" />
                                        ) : (
                                            <div className="flex h-36 items-center justify-center text-muted-foreground">
                                                <Sparkles className="h-8 w-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium">{template.name}</div>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            <Badge variant="outline">{template.category?.name || template.documentType}</Badge>
                                            <Badge variant="secondary" className="capitalize">{template.orientation}</Badge>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">No template selected.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Student</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input className="pl-9" placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                            </div>
                            <Select
                                disabled={studentsQuery.isLoading || studentsQuery.isError || students.length === 0}
                                value={effectiveSelectedStudentId}
                                onValueChange={setSelectedStudentId}
                            >
                                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                                <SelectContent>
                                    {students.map((student) => (
                                        <SelectItem key={student.userId || student.id} value={student.userId || student.id}>
                                            {student.name || student.user?.name} {student.rollNumber ? `(${student.rollNumber})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedStudent && (
                                <div className="flex items-center gap-3 rounded-md border p-3">
                                    <Avatar>
                                        <AvatarImage src={selectedStudent.user?.profilePicture || selectedStudent.profilePicture} />
                                        <AvatarFallback>{(selectedStudent.name || 'S').slice(0, 1)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium">{selectedStudent.name || selectedStudent.user?.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedStudent.class?.className || selectedStudent.className || 'Class'} {selectedStudent.section?.name || selectedStudent.sectionName || ''}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label>Issue date</Label>
                                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                <section
                    ref={previewContainerRef}
                    className="overflow-hidden rounded-lg border bg-background p-6"
                    style={{ height: 'calc(100vh - 200px)' }}
                >
                    {resolvedLayout ? (
                        <div className="flex h-full w-full items-start justify-start">
                            <div
                                ref={certWrapperRef}
                                style={{
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: 'top left',
                                    flexShrink: 0,
                                }}
                            >
                                <CertificateDesignEditor initialConfig={resolvedLayout} readOnly templateType="marketplace" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Users className="mr-2 h-5 w-5" />
                            Choose a template and student to preview
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function TemplateChooser({ templates, loading, onChoose }) {
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (templates || []).filter((template) =>
            !q || [template.name, template.category?.name, template.documentType]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [templates, query]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search my templates..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {loading ? (
                <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
                <div className="grid max-h-[520px] gap-3 overflow-auto md:grid-cols-2">
                    {filtered.map((template) => (
                        <button
                            key={`${template.source}-${template.id}`}
                            onClick={() => onChoose(template.id)}
                            className="flex gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
                        >
                            <div className="h-20 w-24 shrink-0 overflow-hidden rounded border bg-muted">
                                {templatePreviewImage(template) ? (
                                    <img src={templatePreviewImage(template)} alt={template.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate font-medium">{template.name}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{template.category?.name || template.documentType}</div>
                                <div className="mt-2 flex gap-2">
                                    <Badge variant="outline" className="capitalize">{template.orientation}</Badge>
                                    <Badge variant={template.source === 'school-copy' ? 'default' : 'secondary'}>
                                        {template.source === 'school-copy' ? 'My copy' : template.pricing}
                                    </Badge>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}