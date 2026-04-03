'use client';

import { useState, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Trophy, Loader2, Upload, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadFilesToR2 } from '@/hooks/useR2Upload';

const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { ...options?.headers };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return fetch(url, { ...options, headers });
};

export default function AtlasAchievementDialog({ open, onOpenChange, schoolId, existingAchievements = [] }) {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef();

    const [formData, setFormData] = useState({
        title: '',
        year: new Date().getFullYear().toString(),
        category: 'Academics',
        level: 'National',
        description: '',
        rank: '',
        imageUrl: ''
    });

    const [selectedFile, setSelectedFile] = useState(null);

    const categories = ['Academics', 'Sports', 'Arts', 'Technology', 'Extracurricular', 'Recognition', 'Others'];
    const levels = ['School', 'Zonal', 'State', 'National', 'International'];

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.year.trim()) {
            return toast.error('Achievement title and year are required');
        }

        setIsSaving(true);
        try {
            let uploadedImageUrl = formData.imageUrl;

            if (selectedFile) {
                const res = await uploadFilesToR2('gallery', {
                    files: [selectedFile],
                    input: { schoolId, subFolder: 'atlas_achievements' },
                });
                if (res && res[0]) {
                    uploadedImageUrl = res[0].url;
                }
            }

            const newAchievement = {
                id: uuidv4(),
                ...formData,
                imageUrl: uploadedImageUrl
            };

            const updatedAchievements = [...existingAchievements, newAchievement];

            const reqRes = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ achievements: updatedAchievements }),
            });

            if (!reqRes.ok) throw new Error('Failed to save achievement');

            queryClient.invalidateQueries({ queryKey: ['atlas-school-detail', schoolId] });
            toast.success('Achievement added!');

            setFormData({
                title: '',
                year: new Date().getFullYear().toString(),
                category: 'Academics',
                level: 'National',
                description: '',
                rank: '',
                imageUrl: ''
            });
            setSelectedFile(null);
            onOpenChange(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        Add New Achievement
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Achievement Title *</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                placeholder="e.g. 1st Place in National Science Fair"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Year *</Label>
                                <Input
                                    value={formData.year}
                                    onChange={(e) => setFormData(p => ({ ...p, year: e.target.value }))}
                                    placeholder="2023" type="number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Rank/Position</Label>
                                <Input
                                    value={formData.rank}
                                    onChange={(e) => setFormData(p => ({ ...p, rank: e.target.value }))}
                                    placeholder="e.g. 1st, Gold Medallist"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={formData.category} onValueChange={(val) => setFormData(p => ({ ...p, category: val }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Level</Label>
                                <Select value={formData.level} onValueChange={(val) => setFormData(p => ({ ...p, level: val }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                placeholder="Short details..."
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Image / Certificate</Label>

                            {selectedFile || formData.imageUrl ? (
                                <div className="relative border rounded-lg p-2 flex flex-col items-center justify-center bg-muted/30">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                    <span className="text-sm font-medium text-center truncate w-full px-4">
                                        {selectedFile ? selectedFile.name : formData.imageUrl.substring(0, 30) + '...'}
                                    </span>
                                    <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => {
                                        setSelectedFile(null);
                                        setFormData(p => ({ ...p, imageUrl: '' }));
                                    }}>
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors h-[110px]"
                                >
                                    <input
                                        type="file" className="hidden" ref={fileInputRef} accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                                        }}
                                    />
                                    <Upload className="w-5 h-5 text-muted-foreground mb-2" />
                                    <p className="text-xs font-medium text-center">Click to upload image</p>
                                </div>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-muted-foreground mx-1">OR URL:</span>
                                <Input
                                    className="h-8 text-xs disabled:opacity-50"
                                    placeholder="Paste image URL here"
                                    value={formData.imageUrl}
                                    onChange={(e) => {
                                        setFormData(p => ({ ...p, imageUrl: e.target.value }));
                                        setSelectedFile(null);
                                    }}
                                    disabled={!!selectedFile}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !formData.title.trim()}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Achievement
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
