'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    BookOpen,
    Plus,
    Trash2,
    Edit2,
    Save,
    X,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Link from 'next/link';

export default function HPCCompetenciesPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingCompetency, setEditingCompetency] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', subjectId: '' });

    // Fetch competencies
    const { data: competenciesData, isLoading } = useQuery({
        queryKey: ['hpc-competencies', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/competencies`);
            if (!res.ok) return { competencies: [] };
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch subjects for dropdown
    const { data: subjectsData } = useQuery({
        queryKey: ['subjects', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/subjects`);
            if (!res.ok) return { subjects: [] };
            return res.json();
        },
        enabled: !!schoolId,
    });

    const competencies = competenciesData?.competencies || [];
    const subjects = subjectsData?.subjects || subjectsData || [];

    // Create competency mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/competencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjectId: data.subjectId,
                    competencies: [{ name: data.name, description: data.description }]
                }),
            });
            if (!res.ok) throw new Error('Failed to create competency');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-competencies']);
            toast.success('Competency created successfully');
            setIsAddDialogOpen(false);
            resetForm();
        },
        onError: () => toast.error('Failed to create competency'),
    });

    // Update competency mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/competencies/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update competency');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-competencies']);
            toast.success('Competency updated successfully');
            setEditingCompetency(null);
            resetForm();
        },
        onError: () => toast.error('Failed to update competency'),
    });

    // Delete competency mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/competencies/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete competency');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['hpc-competencies']);
            toast.success('Competency deleted successfully');
        },
        onError: () => toast.error('Failed to delete competency'),
    });

    const resetForm = () => {
        setFormData({ name: '', description: '', subjectId: '' });
    };

    const handleEdit = (comp) => {
        setEditingCompetency(comp);
        setFormData({
            name: comp.name,
            description: comp.description || '',
            subjectId: comp.subjectId,
        });
        setIsAddDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.subjectId) {
            toast.error('Please fill in required fields');
            return;
        }

        if (editingCompetency) {
            updateMutation.mutate({ id: editingCompetency.id, ...formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    // Filter competencies
    const filteredCompetencies = competencies.filter(comp => {
        const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = selectedSubject === 'all' || comp.subjectId === selectedSubject;
        return matchesSearch && matchesSubject;
    });

    // Group by subject
    const competenciesBySubject = filteredCompetencies.reduce((acc, comp) => {
        const subjectName = comp.subject?.name || 'General';
        if (!acc[subjectName]) acc[subjectName] = [];
        acc[subjectName].push(comp);
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
                            <BookOpen className="w-7 h-7 text-blue-600" />
                            Academic Competencies
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Define subject-wise competencies for HPC grading
                        </p>
                    </div>
                </div>
                <Button onClick={() => { setEditingCompetency(null); resetForm(); setIsAddDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Competency
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search competencies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filter by subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                {subjects.map((subject) => (
                                    <SelectItem key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Competencies List */}
            {Object.keys(competenciesBySubject).length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-muted-foreground">No competencies found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Add competencies per subject for HPC grading
                        </p>
                        <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Competency
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {Object.entries(competenciesBySubject).map(([subject, comps]) => (
                        <Card key={subject}>
                            <CardHeader className="border-b py-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-blue-600">{subject}</CardTitle>
                                    <Badge variant="outline">{comps.length} competencies</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Competency Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right w-32">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {comps.map((comp) => (
                                            <TableRow key={comp.id}>
                                                <TableCell className="font-medium">{comp.name}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {comp.description || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleEdit(comp)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-600"
                                                            onClick={() => deleteMutation.mutate(comp.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCompetency ? 'Edit Competency' : 'Add New Competency'}
                        </DialogTitle>
                        <DialogDescription>
                            Define a competency for academic assessment
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject *</Label>
                            <Select
                                value={formData.subjectId}
                                onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Competency Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Conceptual Understanding"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of this competency..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            {editingCompetency ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
