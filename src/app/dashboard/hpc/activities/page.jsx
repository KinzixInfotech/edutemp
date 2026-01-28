'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    Activity,
    Plus,
    Trash2,
    Edit2,
    Loader2,
    ChevronLeft,
    Search,
    Trophy,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Link from 'next/link';

export default function HPCActivitiesPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    // Fetch activity categories
    const { data: activitiesData, isLoading } = useQuery({
        queryKey: ['hpc-activities', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities`);
            if (!res.ok) return { categories: [] };
            return res.json();
        },
        enabled: !!schoolId,
    });

    const categories = activitiesData?.categories || [];

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categories: [{ name: data.name, description: data.description }]
                }),
            });
            if (!res.ok) throw new Error('Failed to create category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-activities']);
            toast.success('Activity category created successfully');
            setIsAddDialogOpen(false);
            resetForm();
        },
        onError: () => toast.error('Failed to create category'),
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-activities']);
            toast.success('Activity category deleted successfully');
        },
        onError: () => toast.error('Failed to delete category'),
    });

    const resetForm = () => {
        setFormData({ name: '', description: '' });
        setEditingCategory(null);
    };

    const handleEdit = (cat) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            description: cat.description || '',
        });
        setIsAddDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name) {
            toast.error('Please enter category name');
            return;
        }
        createMutation.mutate(formData);
    };

    // Filter categories
    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/hpc">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            <Activity className="w-7 h-7 text-green-600" />
                            Activity Categories
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Define co-curricular activity categories
                        </p>
                    </div>
                </div>
                <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                </Button>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Categories Grid */}
            {filteredCategories.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Activity className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-muted-foreground">No activity categories found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Run the seed script or add categories manually
                        </p>
                        <code className="block mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                            node prisma/seed-hpc-defaults.js
                        </code>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((cat) => (
                        <Card key={cat.id} className="group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                            <Trophy className="w-5 h-5 text-green-600" />
                                        </div>
                                        <CardTitle className="text-lg">{cat.name}</CardTitle>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleEdit(cat)}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={() => deleteMutation.mutate(cat.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {cat.description && (
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {cat.description}
                                    </p>
                                )}
                                <Badge variant="secondary">
                                    {cat._count?.activities || 0} activities
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Category' : 'Add Activity Category'}
                        </DialogTitle>
                        <DialogDescription>
                            Define a co-curricular activity category
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Category Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Sports, Arts, Music"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingCategory ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
