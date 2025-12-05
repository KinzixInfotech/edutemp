'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react';

export default function GalleryManagement() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ imageUrl: '', caption: '' });

    const { data, isLoading } = useQuery({
        queryKey: ['school-gallery', fullUser?.schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/gallery`);
            if (!response.ok) throw new Error('Failed to fetch');
            return response.json();
        },
        enabled: !!fullUser?.schoolId,
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/gallery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-gallery']);
            setIsDialogOpen(false);
            setFormData({ imageUrl: '', caption: '' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/gallery?id=${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-gallery']);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.imageUrl) {
            createMutation.mutate(formData);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Gallery</h1>
                    <p className="text-muted-foreground">Manage your school's photo gallery</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Photo
                </Button>
            </div>

            {data?.gallery && data.gallery.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.gallery.map((item) => (
                        <Card key={item.id} className="overflow-hidden group relative">
                            <img
                                src={item.imageUrl}
                                alt={item.caption || 'Gallery image'}
                                className="w-full h-48 object-cover"
                            />
                            {item.caption && (
                                <div className="p-3">
                                    <p className="text-sm text-muted-foreground line-clamp-2">{item.caption}</p>
                                </div>
                            )}
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteMutation.mutate(item.id)}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-12 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-xl text-muted-foreground mb-2">No photos added yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Start building your school's photo gallery</p>
                    <Button onClick={() => setIsDialogOpen(true)}>Add First Photo</Button>
                </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Photo</DialogTitle>
                        <DialogDescription>Add a new photo to your school gallery</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="imageUrl">Image URL *</Label>
                            <Input
                                id="imageUrl"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                                required
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Upload images to your Media Library and paste the URL here
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="caption">Caption (Optional)</Label>
                            <Input
                                id="caption"
                                value={formData.caption}
                                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                                placeholder="Describe this photo..."
                            />
                        </div>
                        <Button type="submit" disabled={createMutation.isPending} className="w-full">
                            {createMutation.isPending ? 'Adding...' : 'Add Photo'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
