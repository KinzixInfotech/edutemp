// components/signature-stamp/AssignmentsTab.jsx (for assigning to templates)
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
// import FabricCanvas from '../FabricCanvas';

const FabricCanvas = dynamic(() => import('../FabricCanvas'), { ssr: false });

export default function AssignmentsTab() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [templateId, setTemplateId] = useState('');
    const [signatureId, setSignatureId] = useState('');
    const [stampId, setStampId] = useState('');

    const [positions, setPositions] = useState({}); // { sigId: {x,y,scale,rotation}, stampId: {x,y,scale,rotation} }

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['templates', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/templates/${schoolId}`); // Assume endpoint for templates
            return res.json();
        },
    });

    const { data: signatures = [] } = useQuery({
        queryKey: ['signatures', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/signatures/${schoolId}`);
            return res.json();
        },
    });

    const { data: stamps = [] } = useQuery({
        queryKey: ['stamps', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/stamps/${schoolId}`);
            return res.json();
        },
    });

    const assignSignatureMutation = useMutation({
        mutationFn: async () => {
            if (!templateId || !signatureId) return;
            const data = { signatureId, ...positions[sigId] || { x: 0, y: 0, scale: 1, rotation: 0 }, templateType: 'idcard' }; // Adjust type
            const res = await fetch(`/api/documents/templates/${templateId}/assign-signature`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return res.json();
        },
        onSuccess: () => toast.success('Signature assigned'),
    });

    const assignStampMutation = useMutation({
        mutationFn: async () => {
            if (!templateId || !stampId) return;
            const data = { stampId, ...positions[stampId] || { x: 0, y: 0, scale: 1, rotation: 0 }, templateType: 'idcard' };
            const res = await fetch(`/api/documents/templates/${templateId}/assign-stamp`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return res.json();
        },
        onSuccess: () => toast.success('Stamp assigned'),
    });

    const handleCanvasUpdate = (json) => {
        // Extract positions from canvas JSON and update positions state
    };
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Assignments</h2>
            <Select onValueChange={setTemplateId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select Template" />
                </SelectTrigger>
                <SelectContent>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
            </Select>

            <div className="mt-4">
                <Select onValueChange={setSignatureId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Signature" />
                    </SelectTrigger>
                    <SelectContent>
                        {signatures.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={() => assignSignatureMutation.mutate()}>Assign Signature</Button>
            </div>

            <div className="mt-4">
                <Select onValueChange={setStampId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Stamp" />
                    </SelectTrigger>
                    <SelectContent>
                        {stamps.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={() => assignStampMutation.mutate()}>Assign Stamp</Button>
            </div>

            <div className="mt-4">
                <Label>Position Editor</Label>
                <FabricCanvas onUpdate={handleCanvasUpdate} />
            </div>
        </div>
    );
}