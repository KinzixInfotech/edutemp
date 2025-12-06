'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import { toast } from 'sonner';

export default function DesignIdCardPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const handleSave = async (templateData) => {
        try {
            // templateData comes from CertificateDesignEditor's onSave
            // We need to wrap it and send to our create template API
            // For now, assuming we use a generic POST to a templates route or specific ID card one
            // We don't have a specific POST route for templates yet in the plan for *creating* them via API?
            // Ah, the plan said "CRUD" for templates API. I created GET only in `api/.../idcards/templates/route.js`.
            // I should ensure that route handles POST too.

            const res = await fetch(`/api/documents/${schoolId}/idcards/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: templateData.name,
                    layoutConfig: templateData.layoutConfig,
                    isDefault: templateData.isDefault
                })
            });

            if (!res.ok) throw new Error('Failed to save template');

            toast.success('Template saved successfully');
            router.push('/dashboard/documents/idcards/generate');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save template');
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            <div className="h-14 border-b flex items-center justify-between px-4 bg-background">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="font-semibold text-lg">Design ID Card Template</h1>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <CertificateDesignEditor
                    templateType="idcard"
                    onSave={handleSave}
                    initialConfig={{
                        canvasSize: { width: 336, height: 192 }, // Standard CR80 Size in px approx (at 96 DPI? No, usually higher. User can resize)
                    }}
                />
            </div>
        </div>
    );
}
