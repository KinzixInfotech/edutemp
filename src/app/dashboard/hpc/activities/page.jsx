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
    List,
    MoreHorizontal,
    X,
    Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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

    // Category Dialog State
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

    // Activities Management Dialog State
    const [manageActivitiesDialog, setManageActivitiesDialog] = useState({ open: false, category: null });
    const [activityForm, setActivityForm] = useState({ name: '', description: '' });
    const [editingActivity, setEditingActivity] = useState(null);

    // Fetch activity categories (includes sub-activities)
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

    // ====== CATEGORY MUTATIONS ======
    const createCategoryMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: data.name, description: data.description }),
            });
            if (!res.ok) throw new Error('Failed to create category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-activities']);
            toast.success('Category created');
            setIsCategoryDialogOpen(false);
            resetCategoryForm();
        },
        onError: () => toast.error('Failed to create category'),
    });

    const updateCategoryMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities/${editingCategory.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-activities']);
            toast.success('Category updated');
            setIsCategoryDialogOpen(false);
            resetCategoryForm();
        },
        onError: () => toast.error('Failed to update category'),
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-activities']);
            toast.success('Category deleted');
        },
        onError: () => toast.error('Failed to delete category'),
    });

    // ====== SUB-ACTIVITY MUTATIONS ======
    const createActivityMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities/${manageActivitiesDialog.category.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to add activity');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-activities']);
            toast.success('Activity added');
            setActivityForm({ name: '', description: '' });
        },
        onError: () => toast.error('Failed to add activity'),
    });

    const updateActivityMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities/items/${editingActivity.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update activity');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-activities']);
            toast.success('Activity updated');
            setEditingActivity(null);
            setActivityForm({ name: '', description: '' });
        },
        onError: () => toast.error('Failed to update activity'),
    });

    const deleteActivityMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities/items/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete activity');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-activities']);
            toast.success('Activity deleted');
        },
        onError: () => toast.error('Failed to delete activity'),
    });

    // Helpers
    const resetCategoryForm = () => {
        setCategoryForm({ name: '', description: '' });
        setEditingCategory(null);
    };

    const handleCategorySubmit = () => {
        if (!categoryForm.name) return toast.error('Name required');
        if (editingCategory) updateCategoryMutation.mutate(categoryForm);
        else createCategoryMutation.mutate(categoryForm);
    };

    const handleActivitySubmit = () => {
        if (!activityForm.name) return toast.error('Name required');
        if (editingActivity) updateActivityMutation.mutate(activityForm);
        else createActivityMutation.mutate(activityForm);
    };

    const handleEditActivity = (act) => {
        setEditingActivity(act);
        setActivityForm({ name: act.name, description: act.description || '' });
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    // Get current category activities from latest data
    const currentCategoryActivities = manageActivitiesDialog.category
        ? categories.find(c => c.id === manageActivitiesDialog.category.id)?.activities || []
        : [];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/hpc"><Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button></Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            <Activity className="w-7 h-7 text-green-600" />Activity Categories
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Define co-curricular activity categories</p>
                    </div>
                </div>
                <Button onClick={() => { resetCategoryForm(); setIsCategoryDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />Add Category
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
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p>No activity categories found</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((cat) => (
                        <Card key={cat.id} className="group hover:shadow-md transition-shadow relative overflow-hidden">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                            <Trophy className="w-5 h-5 text-green-600" />
                                        </div>
                                        <CardTitle className="text-lg">{cat.name}</CardTitle>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                            setEditingCategory(cat);
                                            setCategoryForm({ name: cat.name, description: cat.description || '' });
                                            setIsCategoryDialogOpen(true);
                                        }}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteCategoryMutation.mutate(cat.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {cat.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{cat.description}</p>}
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{cat.activities?.length || 0} activities</Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="outline" className="w-full" onClick={() => {
                                    setManageActivitiesDialog({ open: true, category: cat });
                                    setActivityForm({ name: '', description: '' });
                                    setEditingActivity(null);
                                }}>
                                    <List className="w-4 h-4 mr-2" />Manage Activities
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Category Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
                        <DialogDescription>Define a main category (e.g., Sports, Arts)</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Category Name *</Label>
                            <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Sports" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCategorySubmit} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                            {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingCategory ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Activities Dialog */}
            <Dialog open={manageActivitiesDialog.open} onOpenChange={(open) => setManageActivitiesDialog({ ...manageActivitiesDialog, open })}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-green-600" />
                            Manage {manageActivitiesDialog.category?.name} Activities
                        </DialogTitle>
                        <DialogDescription>Add specific activities under this category</DialogDescription>
                    </DialogHeader>

                    {/* Add Activity Form */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-4 border">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                            {editingActivity ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingActivity ? 'Edit Activity' : 'Add New Activity'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Name *</Label>
                                <Input
                                    value={activityForm.name}
                                    onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                                    placeholder="e.g., Basketball"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Description</Label>
                                <Input
                                    value={activityForm.description}
                                    onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                                    placeholder="Optional"
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            {editingActivity && (
                                <Button variant="ghost" size="sm" onClick={() => {
                                    setEditingActivity(null);
                                    setActivityForm({ name: '', description: '' });
                                }}>Cancel Edit</Button>
                            )}
                            <Button size="sm" onClick={handleActivitySubmit} disabled={createActivityMutation.isPending || updateActivityMutation.isPending}>
                                {(createActivityMutation.isPending || updateActivityMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                {editingActivity ? 'Update Activity' : 'Add Activity'}
                            </Button>
                        </div>
                    </div>

                    {/* Activities List */}
                    <div className="mt-4 space-y-2">
                        <Label>Existing Activities ({currentCategoryActivities.length})</Label>
                        {currentCategoryActivities.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center italic border border-dashed rounded-lg">No activities added yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {currentCategoryActivities.map((act) => (
                                    <div key={act.id} className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div>
                                            <p className="font-medium text-sm">{act.name}</p>
                                            {act.description && <p className="text-xs text-muted-foreground">{act.description}</p>}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditActivity(act)}>
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteActivityMutation.mutate(act.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
