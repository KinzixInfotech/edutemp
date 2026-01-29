'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Save,
    RefreshCw,
    Sparkles,
    GraduationCap,
    BookOpen,
    Heart,
    Activity,
    CheckCircle,
    Plus,
    X,
    GripVertical
} from "lucide-react";

// NEP Stage metadata
const STAGE_META = {
    FOUNDATIONAL: {
        label: 'Foundational',
        classes: 'Pre-primary to Class 2',
        color: '#10B981',
        icon: Sparkles,
        description: 'Focus on play-based learning, habits, motor skills, and language exposure'
    },
    PREPARATORY: {
        label: 'Preparatory',
        classes: 'Class 3 to 5',
        color: '#F59E0B',
        icon: BookOpen,
        description: 'Basic academics, concept understanding, expression, and group work'
    },
    MIDDLE: {
        label: 'Middle',
        classes: 'Class 6 to 8',
        color: '#3B82F6',
        icon: GraduationCap,
        description: 'Subject depth, critical thinking, application of knowledge, and life skills'
    },
    SECONDARY: {
        label: 'Secondary',
        classes: 'Class 9 to 12',
        color: '#8B5CF6',
        icon: Activity,
        description: 'Academic rigor, career orientation, independent learning, and ethics'
    }
};

// Category Editor Component
function CategoryEditor({ title, icon: Icon, color, items, onChange, disabled }) {
    const [newItem, setNewItem] = useState('');

    const addItem = () => {
        if (!newItem.trim()) return;
        onChange([...items, newItem.trim()]);
        setNewItem('');
    };

    const removeItem = (index) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const moveItem = (fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex >= items.length) return;
        const newItems = [...items];
        const [removed] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, removed);
        onChange(newItems);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color }} />
                <Label className="font-medium">{title}</Label>
                <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 group"
                    >
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => moveItem(index, index - 1)}
                                disabled={disabled || index === 0}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                                <GripVertical className="h-3 w-3 rotate-180" />
                            </button>
                            <button
                                onClick={() => moveItem(index, index + 1)}
                                disabled={disabled || index === items.length - 1}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                                <GripVertical className="h-3 w-3" />
                            </button>
                        </div>
                        <span className="flex-1 text-sm">{item}</span>
                        {!disabled && (
                            <button
                                onClick={() => removeItem(index)}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {!disabled && (
                <div className="flex gap-2">
                    <Input
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder={`Add ${title.toLowerCase()}...`}
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    />
                    <Button size="sm" variant="outline" onClick={addItem}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function StageTemplatesPage() {
    const { fullUser, loading: authLoading } = useAuth();
    const queryClient = useQueryClient();
    const [activeStage, setActiveStage] = useState('FOUNDATIONAL');
    const [editingTemplate, setEditingTemplate] = useState(null);

    const schoolId = fullUser?.schoolId;

    // Fetch templates
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['stage-templates', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/stage-templates`);
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
        enabled: !!schoolId
    });

    // Save template mutation
    const saveMutation = useMutation({
        mutationFn: async (templateData) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/stage-templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templateData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Template saved successfully');
            queryClient.invalidateQueries({ queryKey: ['stage-templates'] });
            setEditingTemplate(null);
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    // Initialize defaults mutation
    const initMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/stage-templates`, {
                method: 'PUT'
            });
            if (!res.ok) throw new Error('Failed to initialize');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Default templates initialized');
            queryClient.invalidateQueries({ queryKey: ['stage-templates'] });
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const templates = data?.templates || [];
    const defaultTemplates = data?.defaultTemplates || {};

    // Get current template (existing or default)
    const getTemplateForStage = (stage) => {
        const existing = templates.find(t => t.stage === stage);
        if (existing) return { ...existing, isExisting: true };
        const defaults = defaultTemplates[stage];
        return defaults ? { ...defaults, stage, isExisting: false } : null;
    };

    const currentTemplate = getTemplateForStage(activeStage);
    const meta = STAGE_META[activeStage];
    const Icon = meta?.icon || Sparkles;

    const handleSave = () => {
        if (!editingTemplate) return;
        saveMutation.mutate({
            stage: activeStage,
            ...editingTemplate
        });
    };

    const startEditing = () => {
        const categories = currentTemplate?.categories || defaultTemplates[activeStage]?.categories || {
            academic: [],
            sel: [],
            activity: []
        };

        setEditingTemplate({
            name: currentTemplate?.name || '',
            academicWeight: currentTemplate?.academicWeight || 0.4,
            selWeight: currentTemplate?.selWeight || 0.3,
            activityWeight: currentTemplate?.activityWeight || 0.3,
            showMarks: currentTemplate?.showMarks ?? false,
            showGrades: currentTemplate?.showGrades ?? true,
            showPercentages: currentTemplate?.showPercentages ?? false,
            categories: {
                academic: [...(categories.academic || [])],
                sel: [...(categories.sel || [])],
                activity: [...(categories.activity || [])]
            }
        });
    };

    const updateWeight = (field, value) => {
        if (!editingTemplate) return;
        const newValue = value / 100;
        const remaining = 1 - newValue;

        const otherFields = ['academicWeight', 'selWeight', 'activityWeight'].filter(f => f !== field);
        const currentOtherSum = otherFields.reduce((sum, f) => sum + editingTemplate[f], 0);

        const newTemplate = { ...editingTemplate, [field]: newValue };
        if (currentOtherSum > 0) {
            otherFields.forEach(f => {
                newTemplate[f] = (editingTemplate[f] / currentOtherSum) * remaining;
            });
        }
        setEditingTemplate(newTemplate);
    };

    const updateCategory = (categoryKey, items) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            categories: {
                ...editingTemplate.categories,
                [categoryKey]: items
            }
        });
    };

    // Get current categories for display
    const getCurrentCategories = () => {
        if (editingTemplate?.categories) return editingTemplate.categories;
        return currentTemplate?.categories || defaultTemplates[activeStage]?.categories || {
            academic: [],
            sel: [],
            activity: []
        };
    };

    if (!schoolId) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="py-10 text-center text-gray-500">
                        No school selected. Please select a school first.
                    </CardContent>
                </Card>
            </div>
        );
    }

    const categories = getCurrentCategories();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-primary" />
                        NEP 2020 Stage Templates
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configure HPC assessment weightages, display options, and competencies for each learning stage
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => initMutation.mutate()}
                        disabled={initMutation.isPending}
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Initialize Defaults
                    </Button>
                </div>
            </div>

            {/* Stage Tabs */}
            <Tabs value={activeStage} onValueChange={(v) => { setActiveStage(v); setEditingTemplate(null); }}>
                <TabsList className="grid bg-[#eef1f3] dark:bg-muted border grid-cols-2 lg:grid-cols-4 gap-1">
                    {Object.entries(STAGE_META).map(([key, meta]) => {
                        const StageIcon = meta.icon;
                        const hasTemplate = templates.some(t => t.stage === key);
                        return (
                            <TabsTrigger
                                key={key}
                                value={key}
                                className="flex items-center gap-2"
                            >
                                <StageIcon className="h-4 w-4" style={{ color: meta.color }} />
                                {meta.label}
                                {hasTemplate && <CheckCircle className="h-3 w-3 text-green-500" />}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {/* Tab Content */}
                {Object.keys(STAGE_META).map(stage => (
                    <TabsContent key={stage} value={stage} className="mt-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Left Column: Stage Info + Weightages */}
                            <div className="space-y-6">
                                {/* Stage Info Card */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="p-3 rounded-xl"
                                                style={{ backgroundColor: STAGE_META[stage].color + '20' }}
                                            >
                                                {(() => {
                                                    const StageIcon = STAGE_META[stage].icon;
                                                    return <StageIcon className="h-6 w-6" style={{ color: STAGE_META[stage].color }} />;
                                                })()}
                                            </div>
                                            <div>
                                                <CardTitle>{STAGE_META[stage].label} Stage</CardTitle>
                                                <CardDescription>{STAGE_META[stage].classes}</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-600 mb-4">{STAGE_META[stage].description}</p>
                                        <Badge variant={currentTemplate?.isExisting ? "default" : "outline"}>
                                            {currentTemplate?.isExisting ? 'Configured' : 'Using Defaults'}
                                        </Badge>
                                    </CardContent>
                                </Card>

                                {/* Configuration Card */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>Weightages & Display</CardTitle>
                                            {!editingTemplate ? (
                                                <Button variant="outline" size="sm" onClick={startEditing}>
                                                    Edit
                                                </Button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSave}
                                                        disabled={saveMutation.isPending}
                                                    >
                                                        <Save className="h-4 w-4 mr-1" />
                                                        Save
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Weightages */}
                                        <div className="space-y-4">
                                            <Label className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-blue-500" />
                                                Academic: {Math.round((editingTemplate?.academicWeight ?? currentTemplate?.academicWeight ?? 0.4) * 100)}%
                                            </Label>
                                            <Slider
                                                value={[Math.round((editingTemplate?.academicWeight ?? currentTemplate?.academicWeight ?? 0.4) * 100)]}
                                                onValueChange={([v]) => updateWeight('academicWeight', v)}
                                                max={80}
                                                min={10}
                                                step={5}
                                                disabled={!editingTemplate}
                                            />

                                            <Label className="flex items-center gap-2">
                                                <Heart className="h-4 w-4 text-pink-500" />
                                                SEL: {Math.round((editingTemplate?.selWeight ?? currentTemplate?.selWeight ?? 0.3) * 100)}%
                                            </Label>
                                            <Slider
                                                value={[Math.round((editingTemplate?.selWeight ?? currentTemplate?.selWeight ?? 0.3) * 100)]}
                                                onValueChange={([v]) => updateWeight('selWeight', v)}
                                                max={60}
                                                min={10}
                                                step={5}
                                                disabled={!editingTemplate}
                                            />

                                            <Label className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-green-500" />
                                                Activity: {Math.round((editingTemplate?.activityWeight ?? currentTemplate?.activityWeight ?? 0.3) * 100)}%
                                            </Label>
                                            <Slider
                                                value={[Math.round((editingTemplate?.activityWeight ?? currentTemplate?.activityWeight ?? 0.3) * 100)]}
                                                onValueChange={([v]) => updateWeight('activityWeight', v)}
                                                max={50}
                                                min={10}
                                                step={5}
                                                disabled={!editingTemplate}
                                            />
                                        </div>

                                        {/* Display Options */}
                                        <div className="space-y-4 pt-4 border-t">
                                            <Label className="text-sm font-medium">Display Options</Label>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Show Marks</span>
                                                <Switch
                                                    checked={editingTemplate?.showMarks ?? currentTemplate?.showMarks ?? false}
                                                    onCheckedChange={(v) => editingTemplate && setEditingTemplate({ ...editingTemplate, showMarks: v })}
                                                    disabled={!editingTemplate}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Show Grades</span>
                                                <Switch
                                                    checked={editingTemplate?.showGrades ?? currentTemplate?.showGrades ?? true}
                                                    onCheckedChange={(v) => editingTemplate && setEditingTemplate({ ...editingTemplate, showGrades: v })}
                                                    disabled={!editingTemplate}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Show Percentages</span>
                                                <Switch
                                                    checked={editingTemplate?.showPercentages ?? currentTemplate?.showPercentages ?? false}
                                                    onCheckedChange={(v) => editingTemplate && setEditingTemplate({ ...editingTemplate, showPercentages: v })}
                                                    disabled={!editingTemplate}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Category Editors */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assessment Categories</CardTitle>
                                    <CardDescription>
                                        Define the competencies assessed at this stage. Click Edit to modify.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <CategoryEditor
                                        title="Academic Competencies"
                                        icon={BookOpen}
                                        color="#3B82F6"
                                        items={categories.academic || []}
                                        onChange={(items) => updateCategory('academic', items)}
                                        disabled={!editingTemplate}
                                    />

                                    <CategoryEditor
                                        title="SEL Parameters"
                                        icon={Heart}
                                        color="#EC4899"
                                        items={categories.sel || []}
                                        onChange={(items) => updateCategory('sel', items)}
                                        disabled={!editingTemplate}
                                    />

                                    <CategoryEditor
                                        title="Activity Types"
                                        icon={Activity}
                                        color="#10B981"
                                        items={categories.activity || []}
                                        onChange={(items) => updateCategory('activity', items)}
                                        disabled={!editingTemplate}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* Info Banner */}
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <CardContent className="py-4 flex items-center gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-blue-800 dark:text-blue-200 font-medium">NEP 2020 Compliant</p>
                        <p className="text-blue-600 dark:text-blue-400 text-sm">
                            Our Holistic Progress Card adapts automatically to the student's learning stage, exactly as recommended by NEP 2020.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
