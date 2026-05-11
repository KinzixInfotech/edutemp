'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { ArrowLeft, Download, FileArchive, Loader2, Search, Users } from 'lucide-react';

import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAcademicYear } from '@/context/AcademicYearContext';
import { useAuth } from '@/context/AuthContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { buildDocumentMappingContext, buildResolvedTemplateConfig } from '@/lib/shared-field-resolver';
import { createPdfBlobFromLayout } from '@/lib/client-document-pdf';

export default function UnifiedBulkDocumentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { fullUser } = useAuth();
    const { selectedYear } = useAcademicYear();
    const schoolId = fullUser?.schoolId;
    const [templateId, setTemplateId] = useState(searchParams.get('templateId') || '');
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('ALL');
    const [templateSearch, setTemplateSearch] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [showToParent, setShowToParent] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const { startUpload } = useR2Upload({ folder: 'documents/generated' });

    const templatesQuery = useQuery({
        queryKey: ['my-document-templates'],
        queryFn: async () => {
            const res = await fetchWithAuth('/api/templates/my');
            if (!res.ok) throw new Error('Failed to load templates');
            return res.json();
        },
        staleTime: 60_000,
    });

    const templateQuery = useQuery({
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

    const classesQuery = useQuery({
        queryKey: ['classes', schoolId, selectedYear?.id],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedYear?.id) params.set('academicYearId', selectedYear.id);
            const res = await fetch(`/api/schools/${schoolId}/classes?${params}`);
            if (!res.ok) throw new Error('Failed to load classes');
            const data = await res.json();
            return data.data || data;
        },
        enabled: !!schoolId,
        staleTime: 60_000,
    });

    const sectionsQuery = useQuery({
        queryKey: ['sections', schoolId, classId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes/${classId}/sections`);
            if (!res.ok) throw new Error('Failed to load sections');
            const data = await res.json();
            return data.data || data;
        },
        enabled: !!schoolId && !!classId,
        staleTime: 60_000,
    });

    const studentsQuery = useQuery({
        queryKey: ['bulk-document-students', schoolId, classId, sectionId],
        queryFn: async () => {
            const params = new URLSearchParams({ classId, limit: '500' });
            if (sectionId && sectionId !== 'ALL') params.set('sectionId', sectionId);
            const res = await fetch(`/api/schools/${schoolId}/students?${params}`);
            if (!res.ok) throw new Error('Failed to load students');
            const data = await res.json();
            return data.data || data;
        },
        enabled: !!schoolId && !!templateId && !!classId,
        staleTime: 30_000,
    });

    const filteredTemplates = useMemo(() => {
        const search = templateSearch.trim().toLowerCase();
        return (templatesQuery.data || []).filter((template) => !search || [template.name, template.category?.name, template.documentType]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search)));
    }, [templatesQuery.data, templateSearch]);

    const previewLayout = useMemo(() => {
        const template = templateQuery.data;
        const student = studentsQuery.data?.[0] || {
            name: 'Sample Student',
            rollNumber: 'ROLL-001',
            admissionNo: 'ADM-001',
            class: { className: 'Class X' },
            section: { name: 'A' },
            FatherName: 'Father Name',
            MotherName: 'Mother Name',
        };
        if (!template?.layoutConfig) return null;
        const context = buildDocumentMappingContext({
            student,
            fullUser,
            selectedYear,
            formValues: { issueDate },
            certificateMeta: { certificateNumber: 'DOC-SAMPLE-001', verificationUrl: 'https://edubreezy.com/verify/sample' },
        });
        return buildResolvedTemplateConfig({ layoutConfig: template.layoutConfig, context });
    }, [templateQuery.data, studentsQuery.data, fullUser, selectedYear, issueDate]);

    const generateZip = async () => {
        const template = templateQuery.data;
        const students = studentsQuery.data || [];
        if (!template) return toast.error('Choose a template first');
        if (!classId) return toast.error('Choose a class');
        if (students.length === 0) return toast.error('No students found for this filter');

        try {
            setGenerating(true);
            setProgress(0);
            setStatusMessage(`Generating ${students.length} documents...`);

            const zip = new JSZip();
            const folder = zip.folder(`${template.name}-${new Date().toISOString().slice(0, 10)}`);
            const historyRecords = [];

            for (let index = 0; index < students.length; index += 1) {
                const student = students[index];
                const documentNumber = `DOC-${Date.now()}-${index + 1}`;
                const context = buildDocumentMappingContext({
                    student,
                    fullUser,
                    selectedYear,
                    formValues: { issueDate },
                    certificateMeta: {
                        certificateNumber: documentNumber,
                        verificationUrl: '',
                    },
                });
                const layout = buildResolvedTemplateConfig({ layoutConfig: template.layoutConfig, context });
                const pdfBlob = await createPdfBlobFromLayout(layout);
                const studentName = student.name || student.user?.name || `student-${index + 1}`;
                folder.file(`${student.rollNumber || index + 1}-${studentName}.pdf`, pdfBlob);
                historyRecords.push({
                    studentId: student.userId || student.id,
                    classId: student.classId,
                    sectionId: student.sectionId,
                    certificateNumber: documentNumber,
                    metadata: {
                        showToParent,
                        placeholderKeys: layout.placeholderKeys,
                    },
                });
                setProgress(Math.round(((index + 1) / students.length) * 100));
            }

            setStatusMessage('Compressing ZIP...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipName = `${template.name}`.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
            const zipFile = new File([zipBlob], `${zipName}-${Date.now()}.zip`, { type: 'application/zip' });
            let zipUrl = null;
            try {
                const upload = await startUpload([zipFile]);
                zipUrl = upload?.[0]?.url || null;
            } catch (error) {
                console.warn('ZIP upload failed; local download will still work.', error);
            }
            saveAs(zipBlob, `${zipName}.zip`);

            await fetchWithAuth(`/api/documents/${schoolId}/generation-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template,
                    generatedById: fullUser?.id,
                    generationMode: 'bulk',
                    issueDate,
                    classId,
                    sectionId: sectionId === 'ALL' ? null : sectionId,
                    zipUrl,
                    metadata: { showToParent },
                    records: historyRecords,
                }),
            });
            queryClient.invalidateQueries({ queryKey: ['document-generation-history'] });
            toast.success('Bulk documents generated and added to history');
        } catch (error) {
            toast.error(error.message || 'Bulk generation failed');
        } finally {
            setGenerating(false);
            setProgress(0);
            setStatusMessage('');
        }
    };

    return (
        <div className="relative flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
            {generating && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
                            <CardTitle>{statusMessage}</CardTitle>
                        </CardHeader>
                        <CardContent><Progress value={progress} /></CardContent>
                    </Card>
                </div>
            )}

            <div className="flex h-14 items-center justify-between border-b px-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/documents/certificates/history')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="flex items-center gap-2 text-lg font-semibold">
                        <FileArchive className="h-5 w-5 text-primary" />
                        Bulk Generate Documents
                    </h1>
                    {studentsQuery.data && <Badge variant="outline">{studentsQuery.data.length} students</Badge>}
                </div>
                <Button onClick={generateZip} disabled={generating || !templateId || !classId}>
                    <Download className="mr-2 h-4 w-4" />
                    Generate ZIP
                </Button>
            </div>

            <div className="flex min-h-0 flex-1">
                <aside className="w-80 shrink-0 space-y-4 overflow-auto border-r bg-background p-4">
                    <div className="space-y-1.5">
                        <Label>Template</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-9" value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search templates..." />
                        </div>
                        <Select value={templateId} onValueChange={setTemplateId}>
                            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                            <SelectContent>
                                {filteredTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Class</Label>
                        <Select value={classId} onValueChange={setClassId}>
                            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                            <SelectContent>
                                {(classesQuery.data || []).map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>{item.className}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Section</Label>
                        <Select value={sectionId} onValueChange={setSectionId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All sections</SelectItem>
                                {(sectionsQuery.data || []).map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Issue date</Label>
                        <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
                    </div>

                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <Label>Push to parents</Label>
                            <p className="text-xs text-muted-foreground">Record this batch as parent-visible.</p>
                        </div>
                        <Switch checked={showToParent} onCheckedChange={setShowToParent} />
                    </div>
                </aside>

                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div>
                            <div className="text-sm font-medium">{templateQuery.data?.name || 'Choose a template'}</div>
                            <div className="text-xs text-muted-foreground">{templateQuery.data?.category?.name || templateQuery.data?.documentType || 'Marketplace-driven generation'}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {studentsQuery.isLoading ? 'Loading students...' : `${studentsQuery.data?.length || 0} matched`}
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-muted/30 p-8">
                        {previewLayout ? (
                            <div className="mx-auto w-fit">
                                <CertificateDesignEditor initialConfig={previewLayout} readOnly templateType="marketplace" />
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">Select a template and class to preview</div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
