'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Award, Plus, Trash2 } from 'lucide-react';

export default function AchievementsManagement() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', year: new Date().getFullYear() });

    const { data, isLoading } = useQuery({
        queryKey: ['school-achievements', fullUser?.schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/achievements`);
            if (!response.ok) throw new Error('Failed to fetch');
            return response.json();
        },
        enabled: !!fullUser?.schoolId,
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/achievements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-achievements']);
            setIsDialogOpen(false);
            setFormData({ title: '', description: '', year: new Date().getFullYear() });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/achievements?id=${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-achievements']);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Achievements</h1>
                    <p className="text-muted-foreground">Manage your school's achievements and awards</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Achievement
                </Button>
            </div>

            {data?.achievements && data.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.achievements.map((achievement) => (
                        <Card key={achievement.id} className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <Award className="h-8 w-8 text-yellow-500 shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold mb-1">{achievement.title}</h3>
                                        {achievement.description && (
                                            <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                                        )}
                                        <span className="text-xs text-muted-foreground">Year: {achievement.year}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteMutation.mutate(achievement.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-12 text-center">
                    <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-xl text-muted-foreground mb-2">No achievements added yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Start showcasing your school's accomplishments</p>
                    <Button onClick={() => setIsDialogOpen(true)}>Add First Achievement</Button>
                </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Achievement</DialogTitle>
                        <DialogDescription>Add a new achievement or award for your school</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., National Science Fair Winner"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the achievement..."
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="year">Year</Label>
                            <Input
                                id="year"
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                min="1900"
                                max={new Date().getFullYear()}
                            />
                        </div>
                        <Button type="submit" disabled={createMutation.isPending} className="w-full">
                            {createMutation.isPending ? 'Adding...' : 'Add Achievement'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
