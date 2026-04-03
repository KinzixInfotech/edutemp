'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { ...options?.headers };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return fetch(url, { ...options, headers });
};

export default function AtlasFeeDialog({ open, onOpenChange, schoolId, existingProfile }) {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        minFee: '',
        maxFee: '',
        feeStructureUrl: '',
        avgFee: '',
        admissionFee: '',
        monthlyTuition: ''
    });

    useEffect(() => {
        if (open && existingProfile) {
            setFormData({
                minFee: existingProfile.minFee || '',
                maxFee: existingProfile.maxFee || '',
                feeStructureUrl: existingProfile.feeStructureUrl || '',
                avgFee: existingProfile.detailedFeeStructure?.avgFee || '',
                admissionFee: existingProfile.detailedFeeStructure?.admissionFee || '',
                monthlyTuition: existingProfile.detailedFeeStructure?.monthlyTuition || ''
            });
        }
    }, [open, existingProfile]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const patchData = {
                minFee: formData.minFee ? parseInt(formData.minFee) : null,
                maxFee: formData.maxFee ? parseInt(formData.maxFee) : null,
                feeStructureUrl: formData.feeStructureUrl || null,
                detailedFeeStructure: {
                    ...existingProfile?.detailedFeeStructure,
                    avgFee: formData.avgFee ? parseInt(formData.avgFee) : null,
                    admissionFee: formData.admissionFee ? parseInt(formData.admissionFee) : null,
                    monthlyTuition: formData.monthlyTuition ? parseInt(formData.monthlyTuition) : null,
                }
            };
            
            const res = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchData),
            });

            if (!res.ok) throw new Error('Failed to update fees');
            
            queryClient.invalidateQueries({ queryKey: ['atlas-school-detail', schoolId] });
            toast.success('Fee information updated!');
            onOpenChange(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Update Fee Information
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Min Fee (₹/year)</Label>
                            <Input 
                                type="number" 
                                value={formData.minFee}
                                onChange={(e) => setFormData(p => ({...p, minFee: e.target.value}))}
                                placeholder="50000" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Max Fee (₹/year)</Label>
                            <Input 
                                type="number" 
                                value={formData.maxFee}
                                onChange={(e) => setFormData(p => ({...p, maxFee: e.target.value}))}
                                placeholder="200000" 
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Average Fee (₹/year)</Label>
                        <Input 
                            type="number" 
                            value={formData.avgFee}
                            onChange={(e) => setFormData(p => ({...p, avgFee: e.target.value}))}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Base Admission Fee</Label>
                            <Input 
                                type="number" 
                                value={formData.admissionFee}
                                onChange={(e) => setFormData(p => ({...p, admissionFee: e.target.value}))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Monthly Tuition</Label>
                            <Input 
                                type="number" 
                                value={formData.monthlyTuition}
                                onChange={(e) => setFormData(p => ({...p, monthlyTuition: e.target.value}))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Fee Structure PDF URL (Optional)</Label>
                        <Input 
                            value={formData.feeStructureUrl}
                            onChange={(e) => setFormData(p => ({...p, feeStructureUrl: e.target.value}))}
                            placeholder="https://example.com/fees.pdf"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
