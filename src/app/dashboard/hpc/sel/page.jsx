'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    Heart,
    Plus,
    Trash2,
    Edit2,
    Loader2,
    ChevronLeft,
    Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const SEL_CATEGORIES = [
    'Discipline & Conduct',
    'Emotional Intelligence',
    'Social Skills',
    'Learning Attitudes',
    'Life Skills',
    'Values & Ethics',
];

export default function HPCSELPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingParam, setEditingParam] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', category: '' });

    // Fetch SEL parameters
    const { data: selData, isLoading } = useQuery({
        queryKey: ['hpc-sel-parameters', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/sel`);
            if (!res.ok) return { parameters: [] };
            return res.json();
        },
        enabled: !!schoolId,
    });

    const selParameters = selData?.parameters || [];

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/sel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parameters: [{ name: data.name, description: data.description, category: data.category }]
                }),
            });
            if (!res.ok) throw new Error('Failed to create parameter');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-sel-parameters']);
            toast.success('SEL parameter created successfully');
            setIsAddDialogOpen(false);
            resetForm();
        },
        onError: () => toast.error('Failed to create parameter'),
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/sel/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete parameter');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-sel-parameters']);
            toast.success('SEL parameter deleted successfully');
        },
        onError: () => toast.error('Failed to delete parameter'),
    });

    const resetForm = () => {
        setFormData({ name: '', description: '', category: '' });
        setEditingParam(null);
    };

    const handleEdit = (param) => {
        setEditingParam(param);
        setFormData({
            name: param.name,
            description: param.description || '',
            category: param.category || '',
        });
        setIsAddDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.category) {
            toast.error('Please fill in required fields');
            return;
        }
        createMutation.mutate(formData);
    };

    // Filter parameters
    const filteredParams = selParameters.filter(param => {
        const matchesSearch = param.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || param.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Group by category
    const paramsByCategory = filteredParams.reduce((acc, param) => {
        const cat = param.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(param);
        return acc;
    }, {});

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
                            <Heart className="w-7 h-7 text-pink-600" />
                            SEL Parameters
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Social-Emotional Learning assessment criteria
                        </p>
                    </div>
                </div>
                <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Parameter
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search parameters..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {SEL_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Parameters List */}
            {Object.keys(paramsByCategory).length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Heart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-muted-foreground">No SEL parameters found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Run the seed script or add parameters manually
                        </p>
                        <code className="block mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                            node prisma/seed-hpc-defaults.js
                        </code>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {Object.entries(paramsByCategory).map(([category, params]) => (
                        <Card key={category}>
                            <CardHeader className="border-b py-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-pink-600">{category}</CardTitle>
                                    <Badge variant="outline">{params.length} parameters</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {params.map((param) => (
                                        <div
                                            key={param.id}
                                            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-start justify-between group"
                                        >
                                            <div>
                                                <p className="font-medium">{param.name}</p>
                                                {param.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {param.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleEdit(param)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500"
                                                    onClick={() => deleteMutation.mutate(param.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                            {editingParam ? 'Edit SEL Parameter' : 'Add SEL Parameter'}
                        </DialogTitle>
                        <DialogDescription>
                            Define a behavior/SEL assessment parameter
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEL_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Parameter Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Discipline"
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
                            {editingParam ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
