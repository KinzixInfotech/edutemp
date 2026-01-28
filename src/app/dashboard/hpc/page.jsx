'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    Settings,
    BookOpen,
    Heart,
    Activity,
    Save,
    Loader2,
    Check,
    AlertCircle,
    Plus,
    Trash2,
    Edit2,
    Lock,
    Unlock,
    FileText,
    Download,
    Eye,
    ChevronRight,
    GraduationCap,
    Users,
    Calendar,
    BarChart3,
    X,
    UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Link from 'next/link';

// SEL Categories
const SEL_CATEGORIES = ['Behavioral', 'Cognitive', 'Emotional', 'Social'];

export default function HPCDashboard() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // Dialog states
    const [competencyDialog, setCompetencyDialog] = useState({ open: false, mode: 'add', data: null });
    const [selDialog, setSelDialog] = useState({ open: false, mode: 'add', data: null });
    const [activityDialog, setActivityDialog] = useState({ open: false, mode: 'add', data: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: '', name: '' });
    const [lockDialog, setLockDialog] = useState({ open: false, term: null, action: '' });

    // Form states
    const [competencyForm, setCompetencyForm] = useState({ name: '', description: '', subjectId: '' });
    const [selForm, setSelForm] = useState({ name: '', description: '', category: 'Behavioral' });
    const [activityForm, setActivityForm] = useState({ name: '', description: '' });

    // ====== FETCH SUBJECTS ======
    const { data: subjectsData } = useQuery({
        queryKey: ['subjects', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/subjects`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!schoolId,
    });
    const subjects = subjectsData?.subjects || subjectsData || [];

    // ====== FETCH COMPETENCIES ======
    const { data: competenciesData, isLoading: competenciesLoading } = useQuery({
        queryKey: ['hpc-competencies', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/competencies`);
            if (!res.ok) return { competencies: [] };
            return res.json();
        },
        enabled: !!schoolId,
    });

    // ====== FETCH SEL PARAMETERS ======
    const { data: selData, isLoading: selLoading } = useQuery({
        queryKey: ['hpc-sel-parameters', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/sel`);
            if (!res.ok) return { parameters: [] };
            return res.json();
        },
        enabled: !!schoolId,
    });

    // ====== FETCH ACTIVITY CATEGORIES ======
    const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
        queryKey: ['hpc-activities', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities`);
            if (!res.ok) return { categories: [] };
            return res.json();
        },
        enabled: !!schoolId,
    });

    // ====== FETCH ACADEMIC YEAR ======
    const { data: academicYearsData } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!schoolId,
    });
    const academicYears = Array.isArray(academicYearsData) ? academicYearsData : (academicYearsData?.academicYears || []);
    const activeYear = academicYears.find(y => y.isActive);

    // ====== FETCH TERM STATUS ======
    const { data: termsData, isLoading: termsLoading } = useQuery({
        queryKey: ['hpc-terms', schoolId, activeYear?.id],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/terms?academicYearId=${activeYear?.id}`);
            if (!res.ok) {
                // Return default terms if API doesn't exist yet
                return {
                    terms: [
                        { number: 1, name: 'Term 1', locked: false, progress: 0 },
                        { number: 2, name: 'Term 2', locked: false, progress: 0 },
                    ]
                };
            }
            return res.json();
        },
        enabled: !!schoolId && !!activeYear?.id,
    });

    const competencies = competenciesData?.competencies || [];
    const selParameters = selData?.parameters || [];
    const activityCategories = activitiesData?.categories || [];
    const terms = termsData?.terms || [
        { number: 1, name: 'Term 1', locked: false, progress: 0 },
        { number: 2, name: 'Term 2', locked: false, progress: 0 },
    ];

    // Group competencies by subject
    const competenciesBySubject = competencies.reduce((acc, comp) => {
        const subjectName = comp.subject?.name || 'General';
        if (!acc[subjectName]) acc[subjectName] = [];
        acc[subjectName].push(comp);
        return acc;
    }, {});

    // Group SEL by category
    const selByCategory = selParameters.reduce((acc, param) => {
        const cat = param.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(param);
        return acc;
    }, {});

    // ====== COMPETENCY MUTATIONS ======
    const createCompetencyMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/competencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create competency');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-competencies'] });
            toast.success('Competency added successfully');
            setCompetencyDialog({ open: false, mode: 'add', data: null });
            setCompetencyForm({ name: '', description: '', subjectId: '' });
        },
        onError: (err) => toast.error(err.message),
    });

    const updateCompetencyMutation = useMutation({
        mutationFn: async ({ id, ...data }) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/competencies/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update competency');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-competencies'] });
            toast.success('Competency updated');
            setCompetencyDialog({ open: false, mode: 'add', data: null });
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteCompetencyMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/competencies/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete competency');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-competencies'] });
            toast.success('Competency deleted');
            setDeleteDialog({ open: false, type: '', id: '', name: '' });
        },
        onError: (err) => toast.error(err.message),
    });

    // ====== SEL MUTATIONS ======
    const createSelMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/sel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create SEL parameter');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-sel-parameters'] });
            toast.success('SEL parameter added');
            setSelDialog({ open: false, mode: 'add', data: null });
            setSelForm({ name: '', description: '', category: 'Behavioral' });
        },
        onError: (err) => toast.error(err.message),
    });

    const updateSelMutation = useMutation({
        mutationFn: async ({ id, ...data }) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/sel/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update SEL parameter');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-sel-parameters'] });
            toast.success('SEL parameter updated');
            setSelDialog({ open: false, mode: 'add', data: null });
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteSelMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/sel/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete SEL parameter');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-sel-parameters'] });
            toast.success('SEL parameter deleted');
            setDeleteDialog({ open: false, type: '', id: '', name: '' });
        },
        onError: (err) => toast.error(err.message),
    });

    // ====== ACTIVITY MUTATIONS ======
    const createActivityMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create activity category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-activities'] });
            toast.success('Activity category added');
            setActivityDialog({ open: false, mode: 'add', data: null });
            setActivityForm({ name: '', description: '' });
        },
        onError: (err) => toast.error(err.message),
    });

    const updateActivityMutation = useMutation({
        mutationFn: async ({ id, ...data }) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update activity category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-activities'] });
            toast.success('Activity category updated');
            setActivityDialog({ open: false, mode: 'add', data: null });
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteActivityMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/activities/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete activity category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hpc-activities'] });
            toast.success('Activity category deleted');
            setDeleteDialog({ open: false, type: '', id: '', name: '' });
        },
        onError: (err) => toast.error(err.message),
    });

    // ====== TERM LOCK MUTATION ======
    const toggleTermLockMutation = useMutation({
        mutationFn: async ({ termNumber, locked }) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/terms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academicYearId: activeYear?.id,
                    termNumber,
                    locked,
                }),
            });
            if (!res.ok) throw new Error('Failed to update term lock status');
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['hpc-terms'] });
            toast.success(`Term ${variables.termNumber} ${variables.locked ? 'locked' : 'unlocked'}`);
            setLockDialog({ open: false, term: null, action: '' });
        },
        onError: (err) => toast.error(err.message),
    });

    // Dialog handlers
    const openEditCompetency = (comp) => {
        setCompetencyForm({
            name: comp.name,
            description: comp.description || '',
            subjectId: comp.subjectId || '',
        });
        setCompetencyDialog({ open: true, mode: 'edit', data: comp });
    };

    const openEditSel = (param) => {
        setSelForm({
            name: param.name,
            description: param.description || '',
            category: param.category || 'Behavioral',
        });
        setSelDialog({ open: true, mode: 'edit', data: param });
    };

    const openEditActivity = (cat) => {
        setActivityForm({
            name: cat.name,
            description: cat.description || '',
        });
        setActivityDialog({ open: true, mode: 'edit', data: cat });
    };

    const handleDelete = () => {
        const { type, id } = deleteDialog;
        if (type === 'competency') deleteCompetencyMutation.mutate(id);
        else if (type === 'sel') deleteSelMutation.mutate(id);
        else if (type === 'activity') deleteActivityMutation.mutate(id);
    };

    const handleCompetencySubmit = () => {
        if (!competencyForm.name.trim()) {
            toast.error('Name is required');
            return;
        }
        if (competencyDialog.mode === 'edit') {
            updateCompetencyMutation.mutate({ id: competencyDialog.data.id, ...competencyForm });
        } else {
            createCompetencyMutation.mutate(competencyForm);
        }
    };

    const handleSelSubmit = () => {
        if (!selForm.name.trim()) {
            toast.error('Name is required');
            return;
        }
        if (selDialog.mode === 'edit') {
            updateSelMutation.mutate({ id: selDialog.data.id, ...selForm });
        } else {
            createSelMutation.mutate(selForm);
        }
    };

    const handleActivitySubmit = () => {
        if (!activityForm.name.trim()) {
            toast.error('Name is required');
            return;
        }
        if (activityDialog.mode === 'edit') {
            updateActivityMutation.mutate({ id: activityDialog.data.id, ...activityForm });
        } else {
            createActivityMutation.mutate(activityForm);
        }
    };

    const isLoading = competenciesLoading || selLoading || activitiesLoading;

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
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <GraduationCap className="w-8 h-8 text-purple-600" />
                        Holistic Progress Card
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        NEP 2020 compliant student progress tracking
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Competencies</p>
                                <p className="text-2xl font-bold">{competencies.length}</p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Across {Object.keys(competenciesBySubject).length} subjects
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">SEL Parameters</p>
                                <p className="text-2xl font-bold">{selParameters.length}</p>
                            </div>
                            <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded-full">
                                <Heart className="w-5 h-5 text-pink-600 dark:text-pink-300" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            In {Object.keys(selByCategory).length} categories
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Activity Categories</p>
                                <p className="text-2xl font-bold">{activityCategories.length}</p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                                <Activity className="w-5 h-5 text-green-600 dark:text-green-300" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Co-curricular tracking
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Term Status</p>
                                <p className="text-2xl font-bold">{terms.filter(t => !t.locked).length}/{terms.length}</p>
                            </div>
                            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-300" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Terms open for input
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="competencies" className="space-y-4">
                <TabsList className="grid bg-[#eef1f3] dark:bg-muted border grid-cols-2 lg:grid-cols-6 gap-1">
                    <TabsTrigger value="competencies">Competencies</TabsTrigger>
                    <TabsTrigger value="sel">Behavior & SEL</TabsTrigger>
                    <TabsTrigger value="activities">Activities</TabsTrigger>
                    <TabsTrigger value="terms">Term Control</TabsTrigger>
                    <TabsTrigger value="teachers">Oversight</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* Competencies Tab */}
                <TabsContent value="competencies">
                    <Card>
                        <CardHeader className="border-b flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    Academic Competencies
                                </CardTitle>
                                <CardDescription>Define subject-wise competencies for grading</CardDescription>
                            </div>
                            <Button onClick={() => {
                                setCompetencyForm({ name: '', description: '', subjectId: '' });
                                setCompetencyDialog({ open: true, mode: 'add', data: null });
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Competency
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {Object.keys(competenciesBySubject).length === 0 ? (
                                <div className="p-8 text-center">
                                    <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-muted-foreground">No competencies defined yet</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Add competencies per subject for HPC grading
                                    </p>
                                    <Button className="mt-4" onClick={() => {
                                        setCompetencyForm({ name: '', description: '', subjectId: '' });
                                        setCompetencyDialog({ open: true, mode: 'add', data: null });
                                    }}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add First Competency
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {Object.entries(competenciesBySubject).map(([subject, comps]) => (
                                        <div key={subject} className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-blue-600">{subject}</h4>
                                                <Badge variant="outline">{comps.length} competencies</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {comps.map((comp) => (
                                                    <div key={comp.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                                                        <span className="text-sm">{comp.name}</span>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCompetency(comp)}>
                                                                <Edit2 className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteDialog({ open: true, type: 'competency', id: comp.id, name: comp.name })}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SEL Tab */}
                <TabsContent value="sel">
                    <Card>
                        <CardHeader className="border-b flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Heart className="w-5 h-5" />
                                    Behavior & SEL Parameters
                                </CardTitle>
                                <CardDescription>Social-Emotional Learning assessment criteria</CardDescription>
                            </div>
                            <Button onClick={() => {
                                setSelForm({ name: '', description: '', category: 'Behavioral' });
                                setSelDialog({ open: true, mode: 'add', data: null });
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Parameter
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {Object.keys(selByCategory).length === 0 ? (
                                <div className="p-8 text-center">
                                    <Heart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-muted-foreground">No SEL parameters defined</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Run the seed script to add default parameters or add manually
                                    </p>
                                    <code className="block mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                                        node prisma/seed-hpc-defaults.js
                                    </code>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {Object.entries(selByCategory).map(([category, params]) => (
                                        <div key={category} className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-pink-600">{category}</h4>
                                                <Badge variant="outline">{params.length} parameters</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {params.map((param) => (
                                                    <div key={param.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                                                        <span className="text-sm">{param.name}</span>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSel(param)}>
                                                                <Edit2 className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteDialog({ open: true, type: 'sel', id: param.id, name: param.name })}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Activities Tab */}
                <TabsContent value="activities">
                    <Card>
                        <CardHeader className="border-b flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    Co-Curricular Activities
                                </CardTitle>
                                <CardDescription>Activity categories for student participation</CardDescription>
                            </div>
                            <Button onClick={() => {
                                setActivityForm({ name: '', description: '' });
                                setActivityDialog({ open: true, mode: 'add', data: null });
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Category
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {activityCategories.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Activity className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-muted-foreground">No activity categories defined</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Run the seed script to add default categories
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                    {activityCategories.map((cat) => (
                                        <div key={cat.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">{cat.name}</h4>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditActivity(cat)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteDialog({ open: true, type: 'activity', id: cat.id, name: cat.name })}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {cat.description && (
                                                <p className="text-sm text-muted-foreground mt-2">{cat.description}</p>
                                            )}
                                            <Badge variant="secondary" className="mt-3">
                                                {cat._count?.activities || 0} activities
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Term Control Tab */}
                <TabsContent value="terms">
                    <Card>
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Term Lock Control
                            </CardTitle>
                            <CardDescription>Lock terms after HPC finalization to prevent edits</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Term</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {terms.map((term) => (
                                        <TableRow key={term.number}>
                                            <TableCell className="font-medium">{term.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={term.locked ? 'default' : 'outline'}>
                                                    {term.locked ? (
                                                        <><Lock className="w-3 h-3 mr-1" /> Locked</>
                                                    ) : (
                                                        <><Unlock className="w-3 h-3 mr-1" /> Open</>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${term.progress || 0}%` }} />
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">{term.progress || 0}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => toast.info('Preview coming soon')}>
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Preview
                                                    </Button>
                                                    <Button
                                                        variant={term.locked ? 'destructive' : 'default'}
                                                        size="sm"
                                                        onClick={() => setLockDialog({ open: true, term, action: term.locked ? 'unlock' : 'lock' })}
                                                    >
                                                        {term.locked ? (
                                                            <><Unlock className="w-4 h-4 mr-1" /> Unlock</>
                                                        ) : (
                                                            <><Lock className="w-4 h-4 mr-1" /> Lock Term</>
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Alert className="mt-4">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                            <strong>Important:</strong> Locking a term prevents teachers from modifying grades,
                            SEL assessments, and activity records. Only admins can unlock terms.
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports">
                    <Card>
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                HPC Reports & Analytics
                            </CardTitle>
                            <CardDescription>Generate reports, preview bulk PDFs, and view class analytics</CardDescription>
                        </CardHeader>
                        <CardContent className="py-8 text-center">
                            <BarChart3 className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                            <h3 className="text-lg font-medium mb-2">HPC Reporting Dashboard</h3>
                            <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                Access the dedicated reporting section to generate bulk PDFs, export data, and view class performance analytics.
                            </p>
                            <Link href="/dashboard/hpc/reports">
                                <Button size="lg" className="gap-2">
                                    Open Reports & Analytics <ChevronRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Teachers Tab */}
                <TabsContent value="teachers">
                    <Card>
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5" />
                                Teacher Oversight
                            </CardTitle>
                            <CardDescription>Monitor grading progress and teacher activity</CardDescription>
                        </CardHeader>
                        <CardContent className="py-8 text-center">
                            <UserCheck className="w-16 h-16 mx-auto text-teal-500 mb-4" />
                            <h3 className="text-lg font-medium mb-2">Teacher Progress Dashboard</h3>
                            <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                Track which teachers have completed their HPC assessments and view entry statistics.
                            </p>
                            <Link href="/dashboard/hpc/teachers">
                                <Button size="lg" className="gap-2">
                                    Open Oversight Dashboard <ChevronRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Competency Dialog */}
            <Dialog open={competencyDialog.open} onOpenChange={(open) => setCompetencyDialog({ ...competencyDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{competencyDialog.mode === 'edit' ? 'Edit Competency' : 'Add Competency'}</DialogTitle>
                        <DialogDescription>Define academic competencies for HPC grading</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Name *</Label>
                            <Input
                                value={competencyForm.name}
                                onChange={(e) => setCompetencyForm({ ...competencyForm, name: e.target.value })}
                                placeholder="e.g., Problem Solving"
                            />
                        </div>
                        <div>
                            <Label>Subject</Label>
                            <Select value={competencyForm.subjectId} onValueChange={(v) => setCompetencyForm({ ...competencyForm, subjectId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={competencyForm.description}
                                onChange={(e) => setCompetencyForm({ ...competencyForm, description: e.target.value })}
                                placeholder="Optional description"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCompetencyDialog({ open: false, mode: 'add', data: null })}>Cancel</Button>
                        <Button onClick={handleCompetencySubmit} disabled={createCompetencyMutation.isPending || updateCompetencyMutation.isPending}>
                            {(createCompetencyMutation.isPending || updateCompetencyMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {competencyDialog.mode === 'edit' ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SEL Dialog */}
            <Dialog open={selDialog.open} onOpenChange={(open) => setSelDialog({ ...selDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selDialog.mode === 'edit' ? 'Edit SEL Parameter' : 'Add SEL Parameter'}</DialogTitle>
                        <DialogDescription>Define Social-Emotional Learning criteria</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Name *</Label>
                            <Input
                                value={selForm.name}
                                onChange={(e) => setSelForm({ ...selForm, name: e.target.value })}
                                placeholder="e.g., Self-Awareness"
                            />
                        </div>
                        <div>
                            <Label>Category</Label>
                            <Select value={selForm.category} onValueChange={(v) => setSelForm({ ...selForm, category: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEL_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={selForm.description}
                                onChange={(e) => setSelForm({ ...selForm, description: e.target.value })}
                                placeholder="Optional description"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelDialog({ open: false, mode: 'add', data: null })}>Cancel</Button>
                        <Button onClick={handleSelSubmit} disabled={createSelMutation.isPending || updateSelMutation.isPending}>
                            {(createSelMutation.isPending || updateSelMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {selDialog.mode === 'edit' ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Activity Dialog */}
            <Dialog open={activityDialog.open} onOpenChange={(open) => setActivityDialog({ ...activityDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{activityDialog.mode === 'edit' ? 'Edit Activity Category' : 'Add Activity Category'}</DialogTitle>
                        <DialogDescription>Define co-curricular activity categories</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Name *</Label>
                            <Input
                                value={activityForm.name}
                                onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                                placeholder="e.g., Sports"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={activityForm.description}
                                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                                placeholder="Optional description"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivityDialog({ open: false, mode: 'add', data: null })}>Cancel</Button>
                        <Button onClick={handleActivitySubmit} disabled={createActivityMutation.isPending || updateActivityMutation.isPending}>
                            {(createActivityMutation.isPending || updateActivityMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {activityDialog.mode === 'edit' ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteDialog.type}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteDialog.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {(deleteCompetencyMutation.isPending || deleteSelMutation.isPending || deleteActivityMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Lock Term Confirmation Dialog */}
            <AlertDialog open={lockDialog.open} onOpenChange={(open) => setLockDialog({ ...lockDialog, open })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {lockDialog.action === 'lock' ? 'Lock' : 'Unlock'} {lockDialog.term?.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {lockDialog.action === 'lock'
                                ? 'Locking this term will prevent all teachers from modifying grades, SEL assessments, and activity records. Only admins can unlock terms.'
                                : 'Unlocking this term will allow teachers to modify grades, SEL assessments, and activity records again.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => lockDialog.term && toggleTermLockMutation.mutate({ termNumber: lockDialog.term.number, locked: lockDialog.action === 'lock' })}
                            className={lockDialog.action === 'lock' ? '' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {toggleTermLockMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {lockDialog.action === 'lock' ? 'Lock Term' : 'Unlock Term'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
