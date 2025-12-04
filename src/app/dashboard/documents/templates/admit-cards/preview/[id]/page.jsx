'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    Loader2,
    FileText,
    ArrowLeft,
    Edit,
    AlertCircle,
    Eye
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';

const DUMMY_DATA = {
    '{{studentName}}': 'John Doe',
    '{{rollNumber}}': '2024001',
    '{{admissionNo}}': 'ADM2024001',
    '{{class}}': 'Class 10',
    '{{section}}': 'A',
    '{{dob}}': '2008-01-15',
    '{{gender}}': 'Male',
    '{{fatherName}}': 'Robert Doe',
    '{{motherName}}': 'Jane Doe',
    '{{address}}': '123 School Lane, City',
    '{{schoolName}}': 'Springfield High School',
    '{{examName}}': 'Annual Examination 2024',
    '{{examDate}}': '2024-03-15',
    '{{examTime}}': '09:00 AM - 12:00 PM',
    '{{seatNumber}}': 'A-101',
    '{{center}}': 'Main Hall, Block A',
    '{{venue}}': 'Room 101',
    '{{principalSignature}}': 'Principal Signature',
};

export default function AdmitCardPreviewPage() {
    const router = useRouter();
    const params = useParams();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const templateId = params?.id;

    const [previewConfig, setPreviewConfig] = useState(null);

    // Fetch template
    const { data: template, isLoading, error } = useQuery({
        queryKey: ['admitcard-template', templateId, schoolId],
        queryFn: async () => {
            if (!schoolId || !templateId) throw new Error('Invalid parameters');
            const res = await fetch(`/api/documents/${schoolId}/admitcard-templates/${templateId}`);
            if (!res.ok) throw new Error('Failed to fetch template');
            return res.json();
        },
        enabled: !!schoolId && !!templateId,
    });

    // Prepare preview config
    useEffect(() => {
        if (template) {
            console.log('Template for preview:', template);
            const lc = template.layoutConfig || {};
            const elements = JSON.parse(JSON.stringify(lc.elements || []));

            const processedElements = elements.map(el => {
                if (el.type === 'text' && el.content) {
                    let content = el.content;
                    Object.entries(DUMMY_DATA).forEach(([key, value]) => {
                        content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
                    });
                    return { ...el, content };
                }
                if (el.type === 'qrcode' && el.content) {
                    let content = el.content;
                    Object.entries(DUMMY_DATA).forEach(([key, value]) => {
                        content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
                    });
                    return { ...el, content };
                }
                if (el.type === 'image' && el.url && el.url.includes('{{studentPhoto}}')) {
                    return { ...el, url: 'https://placehold.co/100x100?text=Photo' };
                }
                return el;
            });

            setPreviewConfig({
                elements: processedElements,
                canvasSize: lc.canvasSize || { width: 800, height: 600 },
                backgroundImage: lc.backgroundImage || ''
            });
        }
    }, [template]);

    if (!schoolId || !templateId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Invalid Template</h2>
                    <p className="text-muted-foreground mb-4">The template ID is invalid or missing.</p>
                    <Button onClick={() => router.push('/dashboard/documents/templates/admit-cards')}>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Failed to Load Template</h2>
                    <p className="text-muted-foreground mb-4">{error.message}</p>
                    <Button onClick={() => router.push('/dashboard/documents/templates/admit-cards')}>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Header Toolbar */}
            <div className="h-16 border-b bg-background flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/documents/templates/admit-cards')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <h1 className="font-semibold text-lg flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Preview: {template?.name}
                    </h1>
                    {template?.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/documents/templates/admit-cards/edit/${templateId}`)}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Template
                    </Button>
                </div>
            </div>

            {/* Preview Workspace */}
            <div className="flex-1 overflow-auto bg-muted/30">
                {previewConfig ? (
                    <div className="min-h-full p-8 flex items-start justify-center">
                        <CertificateDesignEditor
                            initialConfig={previewConfig}
                            readOnly={true}
                            templateType="admitcard"
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                            <p className="text-sm text-muted-foreground">This template has no elements yet.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}