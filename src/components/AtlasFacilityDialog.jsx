'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Landmark, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { ...options?.headers };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return fetch(url, { ...options, headers });
};

export default function AtlasFacilityDialog({ open, onOpenChange, schoolId, existingFacilities = [] }) {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        category: 'Campus',
        description: '',
        isAvailable: true
    });

    const categories = ['Campus', 'Sports', 'Academic', 'Arts', 'Technology', 'Hostel', 'Nutrition', 'Safety', 'Others'];

    const handleSave = async () => {
        if (!formData.name.trim()) return toast.error('Facility name is required');
        
        setIsSaving(true);
        try {
            const newFacility = {
                id: uuidv4(),
                ...formData
            };
            
            const updatedFacilities = [...existingFacilities, newFacility];
            
            const res = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ facilities: updatedFacilities }),
            });

            if (!res.ok) throw new Error('Failed to save facility');
            
            queryClient.invalidateQueries({ queryKey: ['atlas-school-detail', schoolId] });
            toast.success('Facility added!');
            
            setFormData({ name: '', category: 'Campus', description: '', isAvailable: true });
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
                        <Landmark className="w-5 h-5 text-primary" />
                        Add New Facility
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Facility Name</Label>
                        <Input 
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({...p, name: e.target.value}))}
                            placeholder="e.g. Olympic Swimming Pool" 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select 
                            value={formData.category} 
                            onValueChange={(val) => setFormData(p => ({...p, category: val}))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Textarea 
                            value={formData.description}
                            onChange={(e) => setFormData(p => ({...p, description: e.target.value}))}
                            placeholder="Short details about the facility..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center justify-between border p-3 rounded-lg">
                        <div>
                            <Label className="text-base">Available Now?</Label>
                            <p className="text-xs text-muted-foreground">Is this facility currently operational?</p>
                        </div>
                        <Switch 
                            checked={formData.isAvailable}
                            onCheckedChange={(val) => setFormData(p => ({...p, isAvailable: val}))}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Facility
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
